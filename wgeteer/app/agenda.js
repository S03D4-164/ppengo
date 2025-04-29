const mongoose = require("mongoose");
const logger = require("./modules/logger");
//const findChrome = require("./modules/findproc");

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
  defaultLockLifetime: 1000 * 60 * 3,
};

const agenda = new Agenda(connectionOpts);

const helloWorld = require("./tasks/helloWorld");
const wgeteer = require("./tasks/wgeteer");
const psChrome = require("./tasks/psChrome");
const killChrome = require("./tasks/killChrome");
const vtPayload = require("./tasks/vtPayload");
const gsblookup = require("./tasks/gsblookup");
const gsblookupUrl = require("./tasks/gsblookupUrl")

agenda.on("ready", async function () {
  await helloWorld(agenda);
  await wgeteer(agenda);
  await psChrome(agenda);
  await killChrome(agenda);
  await vtPayload(agenda);
  await gsblookup(agenda);
  await gsblookupUrl(agenda);

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
