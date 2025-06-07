const Agenda = require("agenda");
const logger = require("./logger");

const Website = require("./models/website");
const Webpage = require("./models/webpage");
const Response = require("./models/response");

//const mail = require("./mail");
const yara = require("./yara");
//const wappalyze = require("./wappalyze");
const wappalyze = require("./wapalyze");

const mongoConnectionString = process.env.MONGO_DATABASE;

const connectionOpts = {
  db: {
    address: mongoConnectionString,
    collection: "agendaJobs",
    options: {
      useNewUrlParser: true,
    },
  },
  processEvery: "3 seconds",
  maxConcurrency: 4,
  defaultConcurrency: 1,
  defaultLockLifetime: 1000 * 60 * 3,
};
const agenda = new Agenda(connectionOpts);

agenda.define(
  "mongoosasticSync",
  {
    concurrency: 1,
    lockLimit: 1,
    priority: "low",
  },
  async () => {
    const stream = await Response.synchronize();
    let count = 0;

    stream.on("data", function (err, doc) {
      count++;
    });

    stream.on("close", function () {
      console.log("indexed " + count + " documents!");
    });

    stream.on("error", function (err) {
      console.log(err);
    });
  },
);

agenda.define(
  "crawlWeb",
  {
    priority: "low",
  },
  async (job, done) => {
    let websites = await Website.find()
      .where("track.counter")
      .gt(0)
      .populate("last")
      .then((documents) => {
        return documents;
      });
    logger.debug("crawlWeb: " + websites.length);

    if (websites) {
      for (let seq in websites) {
        let website = websites[seq];
        let interval = 60 * 60 * 1000;
        //let interval = 60 * 1000;

        let now = Math.floor(Date.now() / interval);
        let update =
          website.track.period +
          Math.floor(website.last.createdAt.valueOf() / interval);
        logger.debug(Date.now() - website.last.createdAt.valueOf());
        if (now >= update) {
          let webpage = await new Webpage({
            input: website.url,
            option: website.track.option,
          });
          //const previous = website.last;
          await webpage.save(function (err, success) {
            if (err) logger.error(err);
            else logger.debug(webpage._id, success);
          });
          website.track.counter -= 1;
          website.last = webpage;

          await website.save();

          agenda.now("wgeteer", { pageId: webpage._id });
          /*
          let job = await queue.create('wgeteer', {
            pageId: webpage._id,
            lastpageId: webpage.last._id,
            //options:webpage.option,
            //previous: previous,
          }).ttl(10*60*1000);
          */
        }
        //webpage = null;
        website = null;
        interval = null;
        now = null;
        update = null;
      }
    }
    websites = null;
    done();
  },
);

agenda.define(
  "analyzePage",
  {
    priority: "low",
  },
  async (job, done) => {
    try {
      const { pageId } = job.attrs.data;
      logger.debug(`wappalyzer -> ${pageId}`);
      await wappalyze.analyze(pageId);
      logger.debug(`yara -> ${pageId}`);
      await yara.yaraPage(pageId);
      done();
    } catch (err) {
      console.log(err);
    }
  },
);

agenda.define("hello world", function (job, done) {
  logger.debug("agenda ready");
  done();
});

agenda.on("ready", async function () {
  /*
  const purged = await agenda.purge();
  logger.debug(`purged: ${purged}`);
  */
  const canceled = await agenda.cancel({ name: "analyzePage" });
  logger.debug(`canceled: ${canceled}`);

  await agenda.now("hello world", { time: new Date() });
  //agenda.now('crawlWeb');
  await agenda.every("*/10 * * * *", ["crawlWeb"]);
  await agenda.start();
});

agenda.on("start", (job) => {
  logger.debug(`Job ${job.attrs.name} starting`);
});

agenda.on("complete", (job) => {
  logger.debug(`Job ${job.attrs.name} finished`);
});

async function graceful() {
  await agenda.stop();
  process.exit(0);
}

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);

module.exports = agenda;
