var express = require("express");
var router = express.Router();
var paginate = require("express-paginate");

const { Parser } = require("@json2csv/plainjs");

var Diff = require("diff");

const Webpage = require("./models/webpage");
const Request = require("./models/request");
const Harfile = require("./models/harfile");
const Website = require("./models/website");

const logger = require("./logger");
const unzipper = require("unzipper");

router.get("/", function (req, res) {
  var search = [];
  if (typeof req.query.input !== "undefined" && req.query.input) {
    search.push({ input: req.query.input });
  }
  if (typeof req.query.rinput !== "undefined" && req.query.rinput) {
    search.push({ input: new RegExp(RegExp.escape(req.query.rinput)) });
  }

  if (typeof req.query.title !== "undefined" && req.query.title) {
    search.push({ title: new RegExp(req.query.title) });
  }
  if (typeof req.query.url !== "undefined" && req.query.url) {
    search.push({ url: req.query.url });
  }
  if (typeof req.query.payload !== "undefined" && req.query.payload) {
    search.push({ payload: req.query.payload });
  }
  if (typeof req.query.rurl !== "undefined" && req.query.rurl) {
    search.push({
      url: new RegExp(req.query.rurl.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")),
    });
  }

  if (typeof req.query.source !== "undefined" && req.query.source) {
    search.push({ content: new RegExp(req.query.source) });
  }
  if (typeof req.query.ip !== "undefined" && req.query.ip) {
    search.push({ "remoteAddress.ip": new RegExp(req.query.ip) });
  }
  if (typeof req.query.country !== "undefined" && req.query.country) {
    search.push({
      "remoteAddress.geoip.country": new RegExp(req.query.country),
    });
  }
  if (typeof req.query.status !== "undefined" && req.query.status) {
    //search.push({"$where": `/${req.query.status}/.test(this.status)`});
    search.push({ status: req.query.status });
  }
  let verbose;
  if (typeof req.query.verbose !== "undefined" && req.query.verbose) {
    verbose = true;
  }

  if (typeof req.query.csv !== "undefined" && req.query.csv) {
    var find = Webpage.find();
    if (search.length) find = find.and(search);
    find.sort("-createdAt").then((webpage) => {
      var fields = [
        "createdAt",
        "input",
        "title",
        "error",
        "status",
        "remoteAddress.ip",
        "remoteAddress.reverse",
        "remoteAddress.geoip",
        "wappalyzer",
        "securityDetails.issuer",
        "securityDetails.validFrom",
        "securityDetails.validTo",
        "url",
      ];
      const opts = { withBOM: true, fields: fields };
      const parser = new Parser(opts);
      const csv = parser.parse(webpage);

      res.setHeader("Content-disposition", "attachment; filename=webpages.csv");
      res.setHeader("Content-Type", "text/csv; charset=UTF-8");
      res.send(csv);
    });
  } else {
    var query = search.length ? { $and: search } : {};

    Webpage.paginate(
      query,
      {
        sort: { createdAt: -1 },
        page: req.query.page,
        limit: req.query.limit,
        lean: true,
      },
      function (err, result) {
        //console.log(query, err, result)
        let pages = {};
        if (result)
          pages = paginate.getArrayPages(req)(
            5,
            result.totalPages,
            req.query.page,
          );
        res.render("pages", {
          title: "Pages",
          search: req.query,
          result,
          verbose,
          pages: pages,
          err: err,
        });
      },
    );
  }
});

router.get("/:id", async function (req, res) {
  const id = req.params.id;
  let webpage;
  let error;
  try {
    webpage = await Webpage.findById(id);
  } catch (err) {
    logger.error(err);
    error = err.message;
  }

  var previous, diff;
  if (webpage.content) {
    previous = await Webpage.find({
      input: webpage.input,
      createdAt: { $lt: webpage.createdAt },
      //"status":{$ge: 0}
    })
      .sort("-createdAt")
      .lean()
      .then((document) => {
        //console.log(document.length);
        return document;
      });
    if (previous.length) {
      previous = previous[0];
      if (previous.content && webpage.content) {
        diff = Diff.createPatch(
          "",
          previous.content,
          webpage.content,
          previous._id,
          webpage._id,
        );
      }
    }
  }
  //console.log(diff);

  var search = [];
  if (typeof req.query.rurl !== "undefined" && req.query.rurl) {
    //search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    search.push({ url: new RegExp(req.query.rurl) });
  }
  if (typeof req.query.source !== "undefined" && req.query.source) {
    //search.push({"text": new RegExp(RegExp.escape(req.query.source))});
    search.push({ text: new RegExp(req.query.source) });
  }
  if (typeof req.query.status !== "undefined" && req.query.status) {
    search.push({ $where: `/${req.query.status}/.test(this.status)` });
  }

  const result = await Request.paginate(
    { webpage: id },
    {
      //sort: { createdAt: 1 },
      page: req.query.page,
      limit: req.query.limit,
      lean: true,
      populate: {
        path: "response",
        //select:
        //  "_id remoteAddress status statusText securityDetails yara payload text",
      },
    },
    function (err, result) {
      return result;
      //return paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
    },
  );
  //console.log(result.docs)

  var pages = paginate.getArrayPages(req)(5, result.totalPages, req.query.page);

  logger.debug(req.query, search);

  var website = await Website.findOne({ url: webpage.input })
    .lean()
    .then((document) => {
      return document;
    });

  const harfile = await Harfile.findOne({ webpage: webpage._id });
  let har;
  if (harfile) {
    try {
      const zipedHar = Buffer.from(harfile.har);
      if (typeof req.query.har !== "undefined" && req.query.har) {
        const directory = await unzipper.Open.buffer(zipedHar);
        const extracted = await directory.files[0].buffer("infected");
        har = extracted;
      }
    } catch (e) {
      console.log(e);
    }
  }
  //console.log(webpage.screenshots);
  res.render("page", {
    webpage,
    result,
    pages,
    website,
    previous: previous,
    diff,
    search: req.query,
    title: "Page",
    har,
  });
});

router.get("/download/:id", async function (req, res) {
  const id = req.params.id;
  try {
    const harfile = await Harfile.findOne({ webpage: id });
    const filename = `${id}.zip`;
    const buffer = Buffer.from(harfile.har);
    res.set({ "Content-Disposition": `attachment; filename=${filename}` });
    res.status(200).send(buffer);
  } catch (err) {
    logger.error(`Error downloading HAR file: ${err}`);
    res.status(500).send({ error: "Failed to download HAR file." });
  }
});

module.exports = router;
