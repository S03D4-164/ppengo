const kue = require('kue-scheduler')

module.exports = {
  async start(){

let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});

var job = queue.createJob('crawl', {})
.unique('crawl').ttl(600*1000);

queue.clear(function(error,response){
  console.log("[Queue]cleared: ", response);
});

queue.every('* * * * *', job);

queue.process('crawl', 1, (job, done) => {
  crawlWeb(job, done);
});

const Website = require('./models/website');
const Webpage = require('./models/webpage');

const crawlWeb = async (job, done) => {
  const websites = await Website.find()
  .where("track.counter")
  .gt(0)
  .populate("last")
  .then((documents) => {
    return documents;
  });
  console.log("tracked: ",websites.length);

  if(websites){
    for(let seq in websites){
      var website = websites[seq];
      const now = Math.floor(Date.now()/(60*60*1000));
      const update = website.track.period  + Math.floor(website.last.createdAt.valueOf()/(60*60*1000));
      console.log((Date.now()-website.last.createdAt.valueOf())/(60*1000), update-now)
      if (now >= update){
        const webpage = await new Webpage({
          input: website.url,
          option: website.track.option,
        });
        await webpage.save(function (err, success){
          if(err) console.log(err);
          else console.log(webpage);
        });
        website.track.counter -= 1;
        website.track.option = option;
        website.last = webpage;

        await website.save();
        const job = await queue.create('wgeteer', {
          pageId: webpage._id,
          options:webpage.option,
        }).ttl(600*1000);
        await job.save(function(err){
          if( err ) console.log( job.id, err);
          //else console.log( job.id, option);
        });
      }
    }
  }
  done();
}

},

}