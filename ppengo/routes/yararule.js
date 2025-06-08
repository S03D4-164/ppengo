var express = require("express");
var router = express.Router();

const Yara = require("./models/yara");

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
        var pages = result
          ? paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
          : undefined;
        res.render("yararules", {
          title: "YARA rules",
          result,
          pages,
          search: req.query,
          err: err,
        });
      },
    );
  }
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
        yara.actions = req.body["actions"];
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
  //console.log(req.body);
  let saveError;
  try {
    const newrule = new Yara({
      name: req.body["name"],
      rule: req.body["rule"],
      actions: req.body["actions"],
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
