const kue = require('kue-scheduler')

const mail = require("./mail");

const Website = require('./models/website');
const Webpage = require('./models/webpage');

var queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});
queue.watchStuckJobs();

queue.on('job enqueue', function(id, type){
  console.log( 'Job %s got queued of type %s', id, type );
})
.on('job complete', function(id, result){
  kue.Job.get(id, function(err, job){
    if (err) console.log(err);
    if (job){
      job.remove(function(err){
        if (err) throw err;
        console.log('removed completed job #%d', job.id);
      });  
    }
  });
})
.on('job failed attempt', function(id, errorMessage, doneAttempts) {
  console.log('Job failed', id, errorMessage);
}).on('job failed', function(id, errorMessage) {
  console.log('Job failed', id, errorMessage);
}).on('job progress', function(id, progress, data) {
  console.log('job #' + id + ' ' + progress + '% complete with data ' + data);
    if (progress===100 && data){
      if(data["job"]==="wgeteer"){
        //console.log(data);
        var previous = data["previous"];
        var webpage = data["webpage"];
        if (previous && webpage){
          var message = {
            from: 'ppengo@localhost',
            to: 'root@localhost',
            text: previous.status + "->" + webpage.status
          }
          if (previous.status===webpage.status){
            console.log("status not changed");
          }else if (previous.status===200 && webpage.status>400){
            message["subject"] = '[wgeteer] site closed: ' + webpage.input;
            mail.sendMail(message);
          }else if (previous.status>400 && webpage.status===200){
            message["subject"] = '[wgeteer] site opened: ' + webpage.input;
            mail.sendMail(message);  
          }
        }
      }
    }
  }
)


queue.on('already scheduled', function (job) {
  console.log('job already scheduled ' + job.id);
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

const crawlWeb = async (job, done) => {
  job.progress(2, 3, "crawl job started");
  const websites = await Website.find()
  .where("track.counter").gt(0)
  .populate("last")
  .then((documents) => {
    return documents;
  });
  console.log("tracked: ",websites.length);

  if(websites){
    for(let seq in websites){
      var website = websites[seq];
      var minutes = 60*1000;
      var interval = 60*minutes;
      //var interval = 1*minutes;

      const now = Math.floor(Date.now()/(interval));
      const update = website.track.period  + Math.floor(website.last.createdAt.valueOf()/(interval));
      console.log((Date.now()-website.last.createdAt.valueOf())/(minutes), update-now)
      if (now >= update){
        const webpage = await new Webpage({
          input: website.url,
          option: website.track.option,
        });
        var previous = website.last;
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
          previous: previous,
        }).ttl(10*60*1000);
        await job.save(function(err){
          if( err ) console.log( job.id, err);
          //else console.log( job.id, option);
        });
      }
    }
  }
  done();
}


module.exports = {
  start(){
    queue.clear(function(error, response){
      console.log("[Queue]cleared: ", response);
    });
    
    var job = queue.createJob('crawl', {})
    .unique('crawl').ttl(10*60*1000);

    queue.every('* * * * *', job);

    queue.process('crawl', 1, (job, done) => {
      job.progress(1, 3, "crawl process queued");
      crawlWeb(job, done);  
    });
    return queue;
  },
}