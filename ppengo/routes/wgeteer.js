const Webpage = require('./models/webpage');
const Website = require('./models/website');

const kue = require('kue-scheduler')
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});

async function gsbJob(id){
  const job = await queue.create('gsblookup', {
    websiteId:id,
  }).ttl(60*1000).attempts(3).backoff( true );
  await job.save(function(err){
    if( err ) console.log( job.id, err);
  });
  return job;
}

module.exports = {

  async wgetJob(webpage){
    const job = await queue.create('wgeteer', {
        pageId: webpage._id,
        options:webpage.option,
    }).ttl(10*60*1000);
    await job.save(function(err){
    if( err ) console.log( job.id, err);
    //else console.log( job.id, option);
    });
    return job;
  },

  async registerUrl(inputUrl, option, track){

    const webpage = await new Webpage({
      input: inputUrl,
      option: option,
    });
    await webpage.save(function (err, success){
      if(err) console.log(err);
      //else console.log(webpage);
    });

    const website = await Website.findOneAndUpdate(
      {"url": inputUrl},
      {
        "last": webpage._id,
      },
      {"new":true,"upsert":true},
    );

    if (!website.gsb.lookup) await gsbJob(website._id);
    else console.log("gsb checked");

    if (track > 0){
      counter = 24;
      period = 1;
      website.track.counter = counter;
      website.track.period = period;
      website.track.option = option;
      if (track = 2){
        await website.save(function (err, success){
          if(err) console.log(err);
          else console.log(website);
        });
      } else if (track = 1){

        if (!website.track.counter){
          await website.save(function (err, success){
            if(err) console.log(err);
            else console.log(website);
          });
        } 
      }
    }

    return webpage;
  },
}
