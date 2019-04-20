const kue = require('kue-scheduler')
const wgeteer = require('./wgeteer')
const vt = require('./vt')
const gsblookup = require('./gsblookup')

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const queue = kue.createQueue({
  redis: {
    host: "localhost",
    port: 6379
  }
});

/*
const Website = require('./models/website');
const Webpage = require('./models/webpage');

var job = queue.createJob('crawl', {})
.unique('crawl').ttl(100000);

(async function(){

await queue.clear();
console.log("[Queue] cleared.");

const cron = '* * * * *'; 
queue.every(cron, job)
console.log("[Queue] every: ", cron);

})();

job.on('complete', function(result){
  console.log('Job completed with data ', result);
}).on('failed attempt', function(errorMessage, doneAttempts){
  console.log('Job failed',errorMessage);
}).on('failed', function(errorMessage){
  console.log('Job failed', errorMessage);
}).on('progress', function(progress, data){
  console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
});
*/

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

queue.process('vt', 1, (job, done) => {
  getVT(job, done);
});
const getVT = async (job, done) => {
  await vt.vt(job.data.payloadId)
  .then((success) => {
    done();
  })
  .catch((err)=>{
    console.log(err);
    done();
  });
}

queue.process('gsblookup', (job, done) => {
  gsbLookup(job, done);
});
const gsbLookup = async (job, done) => {
  await gsblookup.lookup(job.data.websiteId)
  .then((success) => {
    done();
  })
  .catch((err)=>{
    console.log(err);
    done();
  });
}
