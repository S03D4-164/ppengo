var express = require("express");
var router = express.Router();

//const logger = require("./logger");
//const moment = require("moment");
const agenda = require("./agenda");

const mongoose = require('mongoose')

router.get("/", async function (req, res) {
  const scheduled = await agenda.jobs({ type: "single" });
  console.log(scheduled);
  res.render("administration", { scheduled });
});

router.get("/cancel/:name", async function (req, res) {
  console.log(req.params);
  const canceled = await agenda.disable({
    name: req.params.name,
    type: "single",
  });
  console.log(canceled);
  const scheduled = await agenda.jobs({ type: "single" });
  res.render("administration", { scheduled });
});

router.get("/schedule/:name", async function (req, res) {
  console.log(req.params);
  const enabled = await agenda.enable({
    name: req.params.name,
    type: "single",
  });
  console.log(enabled);
  const scheduled = await agenda.jobs({ type: "single" });
  res.render("administration", { scheduled });
});

router.get("/chrome/:name", async function (req, res) {
  console.log(req.params);
  let job;
  if (req.params.name == "ps") {
    job = await agenda.now("psChrome");
  } else if (req.params.name == "kill") {
    job = await agenda.now("killChrome");
  }
  console.log(job.attrs._id);
  let result;
  let retry = 3;
  while (retry > 0) {
    await new Promise((done) => setTimeout(done, 5 * 1000));
    result = await agenda.jobs({ _id: job.attrs._id });
    console.log(result);
    if (result[0].attrs.data) break;
    else retry = retry - 1;
  }
  const scheduled = await agenda.jobs({ type: "single" });
  res.render("administration", { scheduled, result: result[0] });
});

router.get("/mongo", async function (req, res) {
  const ops = await mongoose.connection.db.admin().command({
      currentOp: 1
  }).then((result) => {
    console.log(result);
    return result;
  })

  const scheduled = await agenda.jobs({ type: "single" });
  res.render("administration", { scheduled, ops });
});

module.exports = router;
