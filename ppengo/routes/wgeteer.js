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

module.exports = {

  async queJob(webpage){
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

  async registerUrl(inputUrl, option){
    inputUrl = inputUrl

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
    if (option['track'] > 0){
      counter = 24;
      period = 1;
      website.track.counter = counter;
      website.track.period = period;
      website.track.option = option;
       
      if (option['track'] = 2){
        await website.save(function (err, success){
          if(err) console.log(err);
          else console.log(website);
        });
    
      } else if (option['track'] = 1){
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
