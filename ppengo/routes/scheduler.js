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
    //kue.app.listen(3030);
    queue.watchStuckJobs();
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

      job.on('complete', function(result) {
      console.log('Job completed with data ', result);
      }).on('failed attempt', function(errorMessage, doneAttempts) {
      console.log('Job failed');
      }).on('failed', function(errorMessage) {
      console.log('Job failed');
      }).on('progress', function(progress, data) {
      console.log('job #' + job.id + ' ' + progress +
      '% complete with data ' + data);
      });

    });

    queue.clear(function(error, response){
      console.log("[Queue]cleared: ", response);
    });

    const Website = require('./models/website');
    const Webpage = require('./models/webpage');

    var job = queue.createJob('crawl', {})
    .unique('crawl').ttl(600*1000);

    queue.every('* * * * *', job);

    queue.process('crawl', 1, (job, done) => {
      job.progress(1, 5, "huga");
      crawlWeb(job, done);  
      //job.progress(5, 5, "hoge");
    });

    const crawlWeb = async (job, done) => {
      await job.progress(2, 5, "foo");
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