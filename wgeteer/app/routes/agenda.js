const mongoose = require("mongoose");
const logger = require("./logger");
const findChrome = require("./findproc");

const mongoConnectionString = "mongodb://127.0.0.1:27017/wgeteer";

mongoose
  .connect(mongoConnectionString, {
    //useNewUrlParser: true,
    //useCreateIndex: true,
    //useFindAndModify: false,
    //useUnifiedTopology: true,
  })
  .then(() => logger.debug("[mongoose] connect completed"))
  .catch((err) => logger.debug("[mongoose] connect error", err));
mongoose.set("maxTimeMS", 30000);
require("../models/webpage");
require("../models/request");
require("../models/response");
require("../models/screenshot");
require("../models/payload");

const Agenda = require("agenda");
const connectionOpts = {
  db: {
    address: mongoConnectionString,
    collection: "agendaJobs",
    options: {
      useNewUrlParser: true,
    },
  },
  processEvery: "5 seconds",
  defaultLockLifetime: 1000 * 60 * 3,
};

const agenda = new Agenda(connectionOpts);

const wgeteer = require("./wgeteer");
const gsblookup = require("./gsblookup");
const vt = require("./vt");

agenda.define("wgeteer", async (job, done) => {
  console.log(job.attrs.data);
  const data = job.attrs.data;
  if (data.count > 1) {
    logger.error(`wgeteer failed: ${data.pageId}`);
    done();
  } else {
    job.attrs.data.count += 1;
    job.save();
  }
  await wgeteer.wget(data.pageId);
  agenda.now("analyzePage", { pageId: data.pageId });
  done();
});

agenda.define("hello world", function (job, done) {
  logger.debug("agenda ready");
  done();
});

agenda.define("vtPayload", async (job, done) => {
  logger.debug(job.attrs);
  await vt
    .vtPayload(job.attrs.data.payloadId)
    .then((success) => {
      console.log("vtPayload success", success);
    })
    .catch((err) => {
      console.log("vtPayload error", err);
    });
  done();
});

agenda.define("gsblookupUrl", async (job, done) => {
  logger.debug(job.attrs);
  const result = await gsblookup.lookupUrl(job.attrs.data.url);
  logger.debug(result);
  await agenda.now("gsbUrlResult", { result: result });
  done();
});

agenda.define("gsblookup", async (job, done) => {
  logger.debug(job.attrs);
  const result = await gsblookup.lookupSite(job.attrs.data.websiteId);
  logger.debug(result);
  //await agenda.now("gsbUrlResult", { result: result });
  done();
});

agenda.define("psChrome", async function (job, done) {
  await job.setShouldSaveResult(true);
  const ps = await findChrome();
  job.attrs.data = ps;
  await job.save();
  done();
});

agenda.define("killChrome", async function (job, done) {
  await job.setShouldSaveResult(true);
  const ps = await findChrome(-1);
  job.attrs.data = ps;
  await job.save();
  done();
});

agenda.on("ready", async function () {
  const canceled = await agenda.cancel({ name: "wgeteer" });
  logger.debug(`canceled: ${canceled}`);
  await agenda.now("hello world", { time: new Date() });
  await agenda.start();
});

agenda.on("start", (job) => {
  logger.info(`Job starting ${job.attrs.name}`);
});

agenda.on("complete", (job) => {
  logger.info(`Job ${job.attrs.name} finished`);
});

module.exports = {
  agenda,
};
