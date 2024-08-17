var express = require("express");
var router = express.Router();

const Payload = require("./models/payload");
const Response = require("./models/response");
const Webpage = require("./models/webpage");
const Screenshot = require("./models/screenshot");

var archiver = require("archiver");
archiver.registerFormat("zip-encrypted", require("archiver-zip-encrypted"));

const yara = require("./yara");

var paginate = require("express-paginate");
const { Parser } = require("@json2csv/plainjs");

const hexdump = require("hexdump-nodejs");
const logger = require("./logger");
const moment = require("moment");

router.get("/", function (req, res) {
  var search = [];
  if (typeof req.query.md5 !== "undefined" && req.query.md5 !== null) {
    search.push({ md5: new RegExp(req.query.md5) });
  }

  if (typeof req.query.csv !== "undefined" && req.query.csv) {
    var find = Payload.find();
    if (search.length) find = find.and(search);
    find
      .lean()
      .sort("-createdAt")
      .then((payload) => {
        var fields = ["createdAt", "md5", "tag"];
        const opts = { withBOM: true, fields: fields };
        const parser = new Parser(opts);
        const csv = parser.parse(payload);

        res.setHeader(
          "Content-disposition",
          "attachment; filename=payloadss.csv",
        );
        res.setHeader("Content-Type", "text/csv; charset=UTF-8");
        res.send(csv);
      });
  } else {
    const now = moment().toDate();
    const query = search.length
      ? { $and: search }
      : { createdAt: { $lte: now } };
    Payload.paginate(
      query,
      {
        sort: { createdAt: -1 },
        page: req.query.page,
        limit: req.query.limit,
        lean: false,
      },
      function (err, result) {
        //console.log(result)
        //console.log(paginate)
        res.render("payloads", {
          title: "Payloads",
          search: req.query,
          result,
          pages: paginate.getArrayPages(req)(
            5,
            result.totalPages,
            req.query.page,
          ),
        });
      },
    );
  }
});

router.get("/download/:id", function (req, res) {
  const id = req.params.id;
  Payload.findById(id)
    .lean()
    .then(async (payload) => {
      //console.log(payload._id);

      var archive = archiver.create("zip-encrypted", {
        zlib: { level: 8 },
        encryptionMethod: "aes256",
        password: "infected",
      });
      archive.on("error", function (err) {
        res.status(500).send({ error: err.message });
      });
      archive.on("end", function () {
        logger.debug("Archive wrote %d bytes", archive.pointer());
      });

      res.attachment(payload.md5 + ".zip");
      archive.pipe(res);
      //var buffer = Buffer.from(payload.payload);
      var buffer = Buffer.from(payload.payload.buffer);
      archive.append(buffer, { name: payload.md5 });
      archive.finalize();
    });
});

router.get("/:id", function (req, res) {
  const id = req.params.id;
  Payload.findById(id).then(async (payload) => {
    const responses = await Response.find()
      .where({ payload: payload._id })
      .lean()
      .sort("-createdAt")
      .then((document) => {
        return document;
      })
      .catch((err) => {
        console.log(err);
      });
    if (req.query.yara) yara.yaraPayload(payload._id);
    let hex;
    if (payload.payload) {
      console.log(payload.payload.length);
      const sizelimit = 1024 * 1024 * 10;
      if (payload.payload.length > sizelimit) hex = "File size is too large.";
      else hex = hexdump(payload.payload);
    }
    res.render("payload", {
      payload,
      responses,
      hex,
    });
  });
});

router.get("/remove/:id", function (req, res) {
  const id = req.params.id;
  Payload.findById(id).then(async (payload) => {
    const payloads = [payload];

    const responses = await Response.find()
      .where({ payload: payload._id })
      .populate({ path: "webpage", populate: { path: "screenshot" } })
      .sort("-createdAt")
      .then((document) => {
        return document;
      })
      .catch((err) => {
        console.log(err);
      });

    let es = [];
    let webpages = [];
    let screenshots = [];
    /*
    webpages = await Webpage.find()
      .where({ responses: { $in: responses } })
      .sort("-createdAt")
      .then((document) => {
        return document;
      })
      .catch((err) => {
        console.log(err);
      });
      */
    for (let response of responses) {
      if (response.webpage) {
        const webpage = response.webpage;
        if (!webpages.includes(webpage)) {
          webpages.push(response.webpage);
        }
        if (webpage.screenshot) {
          const ss = webpage.screenshot;
          if (!screenshots.includes(ss)) {
            screenshots.push(ss);
          }
        }
      }
      var rawQuery = {
        query: {
          query_string: {
            query: response._id,
            fields: ["_id"],
          },
        },
      };
      //logger.debug(rawQuery);
      var hidrate = {
        hydrate: true,
        hydrateOptions: { lean: true },
        hydrateWithESResults: { source: true },
      };
      await Response.esSearch(rawQuery, hidrate).then(function (results) {
        console.log(JSON.stringify(results, null, " "));
        if (results.hits) {
          if (results.hits.hits) {
            es.push(results.hits.hits[0]);
          }
        }
      });
    }
    //console.log(JSON.stringify(es, null, " "));

    res.render("remove", {
      payloads,
      responses,
      es,
      webpages,
      screenshots,
    });
  });
});

module.exports = router;
