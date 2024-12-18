var request = require("request-promise");

const Website = require("./models/website");

async function gsbLookup(url) {
  var ApiEndpoint = "http://127.0.0.1:3001/v4/threatMatches:find";
  var submit = {
    threatInfo: {
      threatEntries: [{ url: url }],
    },
  };
  var options = {
    url: ApiEndpoint,
    json: true,
    body: submit,
    method: "POST",
  };
console.log(options)
  var res = await request(options)
    .then((body) => {
      console.log(body);
      if ("matches" in body) {
        return body;
      } else {
        return { matches: false };
      }
    })
    .catch((err) => {
      return { error: err.message };
    });
  return res;
}

module.exports = {
  async lookupSite(id) {
    var website = await Website.findById(id)
      .then((doc) => {
        return doc;
      })
      .catch((err) => {
        console.log(err);
      });
    const res = await gsbLookup(website.url);
    website.gsb.lookup = res;
    await website.save();
    return res;
  },
  async lookupUrl(url) {
    const res = await gsbLookup(url);
    return res;
  },
};
