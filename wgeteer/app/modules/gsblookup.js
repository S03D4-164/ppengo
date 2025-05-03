const superagent = require("superagent");

const Website = require("../models/website");

async function gsbLookup(url) {
  const ApiEndpoint = "http://127.0.0.1:3001/v4/threatMatches:find";
  const submit = {
    threatInfo: {
      threatEntries: [{ url: url }],
    },
  };

  try {
    console.log({ url: ApiEndpoint, body: submit });
    const res = await superagent
      .post(ApiEndpoint)
      .send(submit)
      .set("Content-Type", "application/json");

    const body = res.body;
    console.log(body);

    if ("matches" in body) {
      return body;
    } else {
      return { matches: false };
    }
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  async lookupSite(id) {
    try {
      const website = await Website.findById(id);
      const res = await gsbLookup(website.url);
      website.gsb.lookup = res;
      await website.save();
      return res;
    } catch (err) {
      console.log(err);
      return { error: err.message };
    }
  },
  async lookupUrl(url) {
    const res = await gsbLookup(url);
    return res;
  },
};
