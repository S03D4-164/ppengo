const Agenda = require('agenda');
const logger = require('./logger')

const Website = require('./models/website');
const Webpage = require('./models/webpage');
const Response = require('./models/response');

const mail = require("./mail");
const yara = require("./yara");
const wappalyze = require("./wappalyze");
const mongoConnectionString = 'mongodb://mongodb/wgeteer';

const connectionOpts = {
    db: {
        address: mongoConnectionString,
        collection: 'agendaJobs',
        options: {
            useNewUrlParser: true,
        },
    },
    processEvery: '5 seconds'
};
const agenda = new Agenda(connectionOpts);

agenda.define('esIndex', async (job, done) => {

  Response.on('es-bulk-sent', function () {
    console.log('buffer sent');
  });
  
  /*
  Response.on('es-bulk-data', function (doc) {
    console.log('Adding ' + doc.title);
  });
  */
 
  Response.on('es-bulk-error', function (err) {
    console.error(err);
  });
  
  Response
    .esSynchronize()
    .then(function () {
      console.log('end.');
    });

})

agenda.define('crawlWeb', async (job, done) => {
    let websites = await Website.find()
    .where("track.counter").gt(0)
    .populate("last")
    .then((documents) => {
      return documents;
    });
    logger.debug("crawlWeb: " + websites.length);
  
    if(websites){
      for(let seq in websites){
        let website = websites[seq];
        let interval = 60 * 60 * 1000;
        //let interval = 60 * 1000;
  
        let now = Math.floor(Date.now()/(interval));
        let update = website.track.period  + Math.floor(website.last.createdAt.valueOf()/(interval));
        logger.debug(Date.now()-website.last.createdAt.valueOf())
        if (now >= update){
          let webpage = await new Webpage({
            input: website.url,
            option: website.track.option,
          });
          //const previous = website.last;
          await webpage.save(function (err, success){
            if(err) logger.error(err);
            else logger.debug(webpage._id);
          });
          website.track.counter -= 1;
          website.last = webpage;
  
          await website.save();

          agenda.now('wgeteer', {pageId: webpage._id});
          /*
          let job = await queue.create('wgeteer', {
            pageId: webpage._id,
            lastpageId: webpage.last._id,
            //options:webpage.option,
            //previous: previous,
          }).ttl(10*60*1000);
          */
        }
        webpage = null;
        website = null;
        interval = null;
        now = null;
        update = null;
      }
    }
    websites = null;
    done();
});

agenda.define('analyzePage', async (job, done) => {
    const {pageId, previous} = job.attrs.data;    
    logger.debug(`wappalyzer -> ${pageId}`);
    await wappalyze.analyze(pageId);
    logger.debug(`yara -> ${pageId}`);
    await yara.yaraPage(pageId);
    done();
});

agenda.define('hello world', function(job, done) {
    logger.debug('agenda ready');
    done();
});

agenda.on('ready', function () {
    agenda.now('hello world', {time: new Date()});
    agenda.now('crawlWeb');
    agenda.every('2 minutes', ['hello world', 'crawlWeb']);
    agenda.start();
});

agenda.on('start', job => {
    logger.debug(`Job ${job.attrs.name} starting`);
});

agenda.on('complete', job => {
    logger.debug(`Job ${job.attrs.name} finished`);
});

module.exports = agenda;
