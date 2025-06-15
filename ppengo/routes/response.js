var express = require("express");
var router = express.Router();

const Response = require("./models/response");
//const Webpage = require("./models/webpage");
//const Request = require("./models/request");

const agenda = require("./agenda");

var paginate = require("express-paginate");
const { Parser } = require("@json2csv/plainjs");

const moment = require("moment");

var Diff = require("diff");
const logger = require("./logger");

router.get("/es/index", async function (req, res) {
  try {
    await Response.esTruncate(async function (err) {
      console.log(err);
    });
  } catch (e) {
    console.error(e);
  }
  await Response.createMapping({
    analysis: {
      filter: {
        pos_filter: {
          type: "kuromoji_part_of_speech",
          stoptags: ["助詞-格助詞-一般", "助詞-終助詞"],
        },
        greek_lowercase_filter: { type: "lowercase", language: "greek" },
      },
      analyzer: {
        kuromoji_analyzer: {
          type: "custom",
          tokenizer: "kuromoji_tokenizer",
          filter: [
            "kuromoji_baseform",
            "pos_filter",
            "greek_lowercase_filter",
            "cjk_width",
          ],
        },
      },
    },
  });

  agenda.now("mongoosasticSync");
  res.redirect(req.baseUrl);
});

router.get("/es", async function (req, res) {
  var size = req.query.size ? Number(req.query.size) : 100;
  var page = req.query.page ? Number(req.query.page) : 1;
  var from = (page - 1) * size;
  //var from = req.query.from?Number(req.query.from):0;
  var rawQuery = {
    from: from,
    size: size,
    query: {
      query_string: {
        query: req.query.query,
        fields: ["text"],
      },
    },
    sort: { createdAt: { order: "desc" } },
  };
  logger.debug(rawQuery);
  var hidrate = {
    hydrate: true,
    hydrateOptions: { lean: true },
    hydrateWithESResults: { source: true },
  };
  let results = await Response.esSearch(rawQuery, hidrate)
    .then((results) => {
      return results;
    })
    .catch((err) => {
      console.error(err.message);
    });
  //console.log(JSON.stringify(results, null, "    "));
  let total, result;
  if (results) {
    total = results.body.hits.total;
    if (total > 0) result = results.body.hits.hydrated;
  }
  res.render("es_responses", {
    result,
    query: req.query.query,
    total,
    size,
    page,
  });
});

router.get("/", function (req, res) {
  let search = [];
  if (typeof req.query.url !== "undefined" && req.query.url) {
    search.push({ url: req.query.url });
  }
  if (typeof req.query.rurl !== "undefined" && req.query.rurl) {
    search.push({ url: new RegExp(req.query.rurl) });
  }

  if (typeof req.query.source !== "undefined" && req.query.source) {
    search.push({ text: new RegExp(req.query.source) });
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

  if (typeof req.query.payload !== "undefined" && req.query.payload) {
    search.push({ payload: req.query.payload });
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

  logger.debug(search);

  if (typeof req.query.csv !== "undefined" && req.query.csv) {
    var find = Response.find();
    if (search.length) find = find.and(search);
    find
      .lean()
      .sort("-createdAt")
      .then((response) => {
        var fields = [
          "createdAt",
          "url",
          "status",
          "remoteAddress.ip",
          "remoteAddress.reverse",
          "remoteAddress.geoip",
          "wappalyzer",
          "securityDetails.issuer",
          "securityDetails.validFrom",
          "securityDetails.validTo",
        ];
        const opts = { withBOM: true, fields: fields };
        const parser = new Parser(opts);
        const csv = parser.parse(response);

        res.setHeader(
          "Content-disposition",
          "attachment; filename=responses.csv",
        );
        res.setHeader("Content-Type", "text/csv; charset=UTF-8");
        res.send(csv);
      });
  } else {
    const now = moment().toDate();
    if (search.length == 0) search.push({ createdAt: { $lte: now } });
    //const query = search.length ? { $and: search } : { $lte: now };
    const query = { $and: search };
    Response.paginate(
      query,
      {
        sort: { createdAt: -1 },
        page: req.query.page,
        limit: req.query.limit,
        lean: true,
      },
      function (err, result) {
        var pages = result
          ? paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
          : undefined;
        res.render("responses", {
          title: "Responses",
          result,
          pages,
          search: req.query,
          err: err,
        });
      },
    );
  }
  /*
  Response
    .find()
    .populate("payload")
    .sort("-createdAt").limit(100)
    .then((webpages) => {
        //console.log(webpages);
        res.render(
          'responses', {
            title: "Response", 
            webpages, 
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
  */
});

router.get("/:id", async function (req, res) {
  const id = req.params.id;
  let response;
  let webpage;
  let request;
  let error;
  try {
    response = await Response.findById(id)
      .populate("request")
      .populate("webpage");

    webpage = response.webpage;
    request = response.request; /* ||
      (await Request.findOne({
        webpage,
        interceptionId: response.interceptionId,
      }));*/
  } catch (err) {
    logger.error(err);
    error = err.message;
  }
  var previous, diff;
  if (response.text) {
    previous = await Response.find({
      url: response.url,
      createdAt: { $lt: response.createdAt },
      //"status":{$ge: 0}
    })
      .lean()
      .sort("-createdAt")
      .then((document) => {
        logger.debug(document.length);
        return document;
      });
    if (previous.length) {
      previous = previous[0];
      if (previous.text && response.text) {
        diff = Diff.createPatch(
          "",
          previous.text,
          response.text,
          previous._id,
          response._id,
        );
      }
    }
  }

  /*
    const previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt}
    }).sort("-createdat").limit(1)
    .then((document) => {
        //console.log(document);
        return document;
      });
    */
  //console.log(response);
  res.render("response", {
    title: "Response",
    webpage: webpage,
    request: request,
    response: response,
    previous,
    diff,
    //payload: payload,
    //model:'response',
  });
});

router.get("/remove/:id", async function (req, res) {
  const id = req.params.id;
  const response = await Response.findById(id)
    .populate("webpage")
    .populate("payload")
    .then((document) => {
      return document;
    });
  const webpage = response.webpage;
  const payload = response.payload;
  var rawQuery = {
    query: {
      query_string: {
        query: id,
        fields: ["_id"],
      },
    },
  };
  logger.debug(rawQuery);
  var hidrate = {
    hydrate: true,
    hydrateOptions: { lean: true },
    hydrateWithESResults: { source: true },
  };
  const es = await Response.esSearch(
    rawQuery,
    hidrate,
    function (err, results) {
      let result;
      if (results) {
        result = results.hits ? results.hits.hits : [];
      }
      return result;
    },
  );
  //console.log(es);
  res.render("remove", {
    webpages: [webpage],
    responses: [response],
    payloads: [payload],
    es: es,
  });
});

module.exports = router;
