var kue = require('kue')
var wgeteer = require('./wgeteer')

let queue = kue.createQueue({
  redis: {
    host: "localhost",
    port: 6379
  }
});

/*
var job = queue.create('wgeteer', {  // Job Type
  url: inputUrl,                    // Job Data
  options:req.body,
}).save( function(err){
  if( !err ) console.log( job.id );
});

job.on('complete', function(result){
  console.log('Job completed with data ', result);

}).on('failed attempt', function(errorMessage, doneAttempts){
  console.log('Job failed');

}).on('failed', function(errorMessage){
  console.log('Job failed');

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
queue.on( 'error', function( err ) {
  console.log( 'Oops... ', err );
});

queue.process('wgeteer', 4, (job, done) => {
  getWeb(job, done);
});

const getWeb = (job, done) => {
  //console.log(job);
  wgeteer.wget(job.data.url, job.data.options);
  //.then((success) => {
  done();
  //});*/
}
