var express = require("express");
var router = express.Router();

const Yara = require("./models/yara");
const Payload = require("./models/payload");
const Response = require("./models/response");
const Webpage = require("./models/webpage");
const Screenshot = require("./models/screenshot");

var archiver = require("archiver");
//archiver.registerFormat("zip-encrypted", require("archiver-zip-encrypted"));

//const yara = require("./yara");

var paginate = require("express-paginate");
const { Parser } = require("@json2csv/plainjs");

const logger = require("./logger");
const moment = require("moment");

router.get("/", function (req, res) {
  var search = [];
  if (typeof req.query.rule !== "undefined" && req.query.rule !== null) {
    search.push({ rule: new RegExp(req.query.rule) });
  }

  if (typeof req.query.csv !== "undefined" && req.query.csv) {
    var find = Yara.find();
    if (search.length) find = find.and(search);
    find
      .lean()
      .sort("-createdAt")
      .then((payload) => {
        var fields = ["createdAt", "name", "rule"];
        const opts = { withBOM: true, fields: fields };
        const parser = new Parser(opts);
        const csv = parser.parse(payload);

        res.setHeader(
          "Content-disposition",
          "attachment; filename=yararules.csv",
        );
        res.setHeader("Content-Type", "text/csv; charset=UTF-8");
        res.send(csv);
      });
  } else {
    const now = moment().toDate();
    const query = search.length
      ? { $and: search }
      : { createdAt: { $lte: now } };
    Yara.paginate(
      query,
      {
        sort: { createdAt: -1 },
        page: req.query.page,
        limit: req.query.limit,
        lean: false,
      },
      function (err, result) {
        res.render("yararules", {
          title: "YARA rules",
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
  Yara.findById(id).then(async (yara) => {
    res.render("yararule", {
      yara,
    });
  });
});

router.post("/:id", function (req, res) {
  const id = req.params.id;
  Yara.findById(id).then(async (yara) => {
    let message;
    if (req.body["name"] && req.body["rule"]) {
      try {
        yara.name = req.body["name"];
        yara.rule = req.body["rule"];
        await yara.save();
        message = "Update succeeded.";
      } catch (err) {
        console.log(err);
        message = err.message;
      }
    } else {
      message = "Error: Invalid Data";
    }
    res.render("yararule", {
      yara,
      message,
    });
  });
});

router.post("/", async function (req, res) {
  console.log(req.body);
  let saveError;
  try {
    const newrule = new Yara({
      name: req.body["name"],
      rule: req.body["rule"],
    });
    await newrule.save();
  } catch (err) {
    saveError = err;
  }
  //const backURL = req.header("Referer") || "/";
  //res.redirect(backURL);
  const now = moment().toDate();
  const query = { createdAt: { $lte: now } };
  Yara.paginate(
    query,
    {
      sort: { createdAt: -1 },
      page: req.query.page,
      limit: req.query.limit,
      lean: false,
    },
    function (err, result) {
      res.render("yararules", {
        title: "YARA rules",
        error: saveError,
        result,
        pages: paginate.getArrayPages(req)(
          5,
          result.totalPages,
          req.query.page,
        ),
      });
    },
  );
});

module.exports = router;
