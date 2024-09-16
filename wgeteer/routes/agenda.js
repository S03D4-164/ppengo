const mongoose = require("mongoose");
const logger = require("./logger");

const mongoConnectionString = "mongodb://127.0.0.1:27017/wgeteer";

mongoose
  .connect(mongoConnectionString, {
    useNewUrlParser: true,
    //useCreateIndex: true,
    //useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => logger.debug("[mongoose] connect completed"))
  .catch((err) => logger.debug("[mongoose] connect error", err));
mongoose.set("maxTimeMS", 30000);
require("./models/webpage");
require("./models/request");
require("./models/response");
require("./models/screenshot");
require("./models/payload");

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
  defaultLockLifetime: 100 * 60 * 3,
};

const agenda = new Agenda(connectionOpts);

const wgeteer = require("./wgeteer");
const gsblookup = require("./gsblookup");
//const vt = require('./vt')

agenda.define("wgeteer", async (job, done) => {
  const { pageId } = job.attrs.data;
  await wgeteer.wget(pageId);
  agenda.now("analyzePage", { pageId: pageId });
  done();
});

agenda.define("hello world", function (job, done) {
  logger.debug("agenda ready");
  done();
});

agenda.define("gsblookupUrl", async (job, done) => {
  logger.debug(job.attrs);
  const result = await gsblookup.lookupUrl(job.attrs.data.url);
  logger.debug(result);
  await agenda.now("gsbUrlResult", { result: result });
  done();
});

agenda.on("ready", function () {
  agenda.now("hello world", { time: new Date() });
  agenda.start();
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
