const Screenshot = require("../routes/models/screenshot");
const logger = require("../routes/logger");
const moment = require("moment");
const paginate = require("express-paginate");
let archiver = require("archiver");
//archiver.registerFormat("zip-encrypted", require("archiver-zip-encrypted"));

exports.screenshots = async (req, res) => {
  let search = [];

  if (typeof req.query.rurl !== "undefined" && req.query.rurl) {
    search.push({ "tag.url": new RegExp(req.query.rurl) });
  }

  if (typeof req.query.tagkey !== "undefined" && req.query.tagkey) {
    elem = {};
    elem[req.query.tagkey] = { $regex: "^.*$" };
    if (typeof req.query.tagval !== "undefined" && req.query.tagval) {
      elem[req.query.tagkey] = new RegExp(req.query.tagval);
    }
    search.push({ tag: { $elemMatch: elem } });
  }

  if (typeof req.query.start !== "undefined" && req.query.start) {
    var start = moment(req.query.start).toDate();
    if (start.toString() != "Invalid Date")
      search.push({ createdAt: { $gte: start } });
  }

  if (typeof req.query.end !== "undefined" && req.query.end) {
    var end = moment(req.query.end).add("days", 1).toDate();
    if (end.toString() != "Invalid Date")
      search.push({ createdAt: { $lte: end } });
  }

  //logger.debug(search);

  if (typeof req.query.export !== "undefined" && req.query.export) {
    let find = Screenshot.find();
    if (search.length) find = find.and(search);
    const screeshots = await find.lean().sort("-createdAt");

    const archive = archiver("zip", {
      zlib: { level: 8 },
    });
    archive.on("error", function (err) {
      res.status(500).send({ error: err.message });
    });
    archive.on("end", function () {
      logger.debug("Archive wrote %d bytes", archive.pointer());
    });

    res.attachment("screenshots.zip");
    archive.pipe(res);
    let names = [];
    for (let screenshot of screeshots) {
      const img = new Buffer.from(screenshot.screenshot, "base64");
      let name = screenshot.md5 + ".png";
      if (screenshot.tag) {
        let tag = screenshot.tag[0];
        if (tag.url) {
          const url = new URL(
            /^https?:\/\//i.test(tag.url) ? tag.url : `http://${tag.url}`,
          );
          name = url.hostname + ".png";
        }
      }
      if (!names.includes(name)) {
        archive.append(img, { name });
        names.push(name);
      }
    }

    archive.finalize();
  } else {
    const now = moment().toDate();
    if (search.length == 0) search.push({ createdAt: { $lte: now } });
    //const query = search.length ? { $and: search } : { $lte: now };
    const query = { $and: search };
    let page = req.query.page ? req.query.page : 1;
    let limit = req.query.limit ? req.query.limit : 100;
    Screenshot.paginate(
      query,
      {
        sort: { createdAt: -1 },
        page,
        limit,
        lean: true,
      },
      function (err, result) {
        var pages = result
          ? paginate.getArrayPages(req)(5, result.totalPages, page)
          : undefined;
        let pageArray = [];
        for (let page of pages) {
          page.url = page.url.replace("NaN", page.number);
          pageArray.push(page);
        }
        pages = pageArray;
        console.log(result, pages);
        res.render("screenshots", {
          title: "Screenshots",
          result,
          pages,
          search: req.query,
          err: err,
        });
      },
    );
  }
};

exports.screenshot = (req, res) => {
  const id = req.params.id;
  //console.log(id);
  Screenshot.findById(id)
    .lean()
    .then((webpage) => {
      //console.log(webpage);
      var img = new Buffer.from(webpage.screenshot, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": img.length,
      });
      res.end(img);
    });
};
