const kue = require('kue-scheduler')
const wgeteer = require('./wgeteer')
const vt = require('./testvt')
const gsblookup = require('./gsblookup')

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoReconnect:true,
  reconnectInterval: 5000,
  reconnectTries: 60
}).then(() =>  console.log('connection succesful'))
.catch((err) => console.error(err));

const queue = kue.createQueue({
  redis: {
    host: "localhost",
    port: 6379
  }
});

/*
queue.on('job enqueue', function(id, type){
  console.log( 'Job %s got queued of type %s', id, type );
})
.on('job complete', function(id, result){
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
queue.on('error', function( err ) {
  console.log( 'Oops... ', err );
});
queue.on('schedule error', function(error) {
  console.log( 'Oops... ', error);
});
queue.on('schedule success', function(job) {
  console.log("[Queue] schedule succeeded: ", job.length);
});
*/

queue.process('wgeteer', 2, (job, done) => {
  getWeb(job, done);
});

const getWeb = async (job, done) => {
  console.log(job.data)
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
