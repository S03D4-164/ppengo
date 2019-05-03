const kue = require('kue-scheduler')
const wgeteer = require('./wgeteer')
const vt = require('./vt')
const gsblookup = require('./gsblookup')

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoReconnect:true,
  reconnectInterval: 5000,
  reconnectTries: 60,
  useFindAndModify: false,
}).then(() =>  console.log('connection succesful'))
.catch((err) => console.error(err));

const Webpage = require('./models/webpage');

const queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "localhost",
    port: 6379
  }
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
  console.log('job scheduled ' + job.id);
});

queue.process('wgeteer', 2, (job, done) => {
  job.progress(1, 3, "wgeteer process queued");
  getWeb(job, done);
});

const getWeb = async (job, done) => {
  job.progress(2, 3, "wgeteer job started");
  var pageId = job.data.pageId;
  var previous = job.data.previous;
  wgeteer.wget(job.data.pageId, job.data.options)
  .then(async (success) => {
    //console.log("success", success);
    const webpage = await Webpage.findById(pageId)
    .then(doc => { return doc; })
    .catch(err =>{ console.log(err);});
    const previousPage = await Webpage.findById(previous)
    .then(doc => { return doc; })
    .catch(err =>{ console.log(err);});
    //console.log(previousPage, success);
    job.progress(3, 3, {"job": "wgeteer", "previous":previousPage, "webpage":success});
    done();
  })
  .catch((err)=>{
    console.log(err);
    done();
  });
}

queue.process('vtPayload', 1, async (job, done) => {
  await payloadVT(job, done);
});
const payloadVT = async (job, done) => {
  await vt.vtPayload(job.data.payloadId)
  .then((success) => {
    console.log("success", success);
    job.progress(1, 1, {"job": "vtPayload", "success":success});
    done();
  })
  .catch((err)=>{
    console.log("error", err);
    job.progress(1, 1, {"job": "vtPayload", "error":err});
    done(err);
  });
}

queue.process('vt', 1, async (job, done) => {
  await getVT(job, done);
});
const getVT = async (job, done) => {
  await vt.vt(job.data.resource)
  .then((success) => {
    console.log("success", success);
    job.progress(1, 1, {"job": "vt", "success":success});
    done();
  })
  .catch((err)=>{
    console.log("error", err);
    job.progress(1, 1, {"job": "vt", "error":err});
    done(err);
  });
}

queue.process('gsblookup', async (job, done) => {
  await gsbLookup(job, done);
});
const gsbLookup = async (job, done) => {
  await gsblookup.lookupSite(job.data.websiteId)
  .then((success) => {
    console.log("success", success);
    job.progress(1, 1, {"job": "gsbLookup", "success":success});
    done();
  })
  .catch((err)=>{
    console.log("error", err);
    job.progress(1, 1, {"job": "gsbLookup", "error":err});
    done(err);
  });
}

queue.process('gsblookupUrl', async (job, done) => {
  await gsbLookupUrl(job, done);
});
const gsbLookupUrl = async (job, done) => {
  await gsblookup.lookupUrl(job.data.url)
  .then((success) => {
    console.log("success", success);
    job.progress(1, 1, {"job": "gsbLookupUrl", "success":success});
    done();
  })
  .catch((err)=>{
    console.log("error", err);
    job.progress(1, 1, {"job": "gsbLookupUrl", "error":err});
    done(err);
  });
}
