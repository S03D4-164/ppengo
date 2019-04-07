const kue = require('kue-scheduler')
const wgeteer = require('./wgeteer')

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Website = require('./models/website');
const Webpage = require('./models/webpage');

const queue = kue.createQueue({
  redis: {
    host: "localhost",
    port: 6379
  }
});

var job = queue.createJob('crawl', {})
.unique('crawl').ttl(100000);

queue.clear(function(error,response){
  console.log("[Queue]cleared: ", response);
});

queue.every('00 */1  * * *', job);
//queue.every('*/1 *  * * *', job);

job.on('complete', function(result){
  console.log('Job completed with data ', result);
}).on('failed attempt', function(errorMessage, doneAttempts){
  console.log('Job failed',errorMessage);
}).on('failed', function(errorMessage){
  console.log('Job failed', errorMessage);
}).on('progress', function(progress, data){
  console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
});

queue.on('job enqueue', function(id, type){
  console.log( 'Job %s got queued of type %s', id, type );
}).on('job complete', function(id, result){
  kue.Job.get(id, function(err, job){
    if (err) return;
    job.remove(function(err){
      if (err) throw err;
      console.log('removed completed job #%d', job.id);
    });
  });
});
queue.on('already scheduled', function (job) {
  console.log('job already scheduled' + job.id);
});
queue.on( 'error', function( err ) {
  console.log( 'Oops... ', err );
});
queue.on('schedule error', function(error) {
  console.log( 'Oops... ', error);
});
queue.on('schedule success', function(job) {
  console.log("[Queue] schedule succeeded: ", job.length);
});

queue.process('crawl', 1, (job, done) => {
  crawlWeb(job, done);
});

const crawlWeb = async (job, done) => {
  const websites = await Website.find()
  .where("track.counter")
  .gt(0)
  .then((documents) => {
    return documents;
  });
  //console.log(websites);

  if(websites){
    for(let seq in websites){
      var website = websites[seq];
      const now = Math.floor(Date.now()/(60*60*1000));
      const update = website.track.period  + Math.floor(website.updatedAt.valueOf()/(60*60*1000));
      console.log(update-now)
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
        website.last = webpage;
        await website.save();
        const job = await queue.create('wgeteer', {
          pageId: webpage._id,
          options:webpage.option,
        }).ttl(100000);
        await job.save(function(err){
          if( err ) console.log( job.id, err);
          //else console.log( job.id, option);
        });
      }
    }
  }
  done();
}

queue.process('wgeteer', 2, (job, done) => {
  getWeb(job, done);
});
const getWeb = async (job, done) => {
  await wgeteer.wget(job.data.pageId, job.data.options)
  .then((success) => {
    done();
  })
  .catch((err)=>{
    console.log(err);
    done();
  });
}
