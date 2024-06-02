const Webpage = require('./models/webpage');
const Website = require('./models/website');

module.exports = {
  async registerUrl(inputUrls, track, user){
    console.log(inputUrls)
    var webpages = [];
    var websites = [];

    for (let input of inputUrls){ 
      const inputUrl = input.url;
      const option = input.option;
      const webpage = await new Webpage({
        input: inputUrl,
        option: option,
      });
      webpages.push(webpage);
    //}
    //for (let webpage of webpages){
      //const inputUrl = webpage.input;
      var website = await Website.findOne(
        {"url": inputUrl}
      );
      if (website){
        website.last = webpage._id;
      } else{
        website = await new Website({
          "url": inputUrl,
          "last": webpage._id,
        });
      }
      console.log(website.group)
      for(let num in user.group){
        if (!website.group.includes(user.group[num])){
          website.group.push(user.group[num]);
        }
      }
      if (track > 0){
        if (track = 2){
          website.track.counter = 24;
          website.track.period = 1;
          website.track.option = option;
        } else if (track = 1){
          if (!website.track.counter){
            website.track.counter = 24;
            website.track.period = 1;
            website.track.option = option;
          } 
        }
      }
      websites.push(website);
    }
    const savedPages = await Webpage.bulkSave(webpages);
    const savedSites = await Website.bulkSave(websites);

    //if (!website.gsb.lookup) await gsbJob(website._id);
    //else console.log("gsb checked");
    return webpages;

  } 
}
