const {
  Index,
  Document,
  Encoder,
  Charset,
  Resolver,
  Worker,
} = require("flexsearch");
const MongoDB = require("flexsearch/db/mongodb");
const MongoClient = require("mongodb").MongoClient;
// assume you've created a custom database instance...
const database = new MongoClient("mongodb://mongodb:27017/");
const encoder = new Encoder(Charset.CJK);
const document = new Document({
  document: {
    id: "_id",
    store: true,
    index: [
      {
        field: "content",
        tokenize: "forward",
        encoder,
      },
    ],
    tag: [
      {
        field: "url",
      },
      {
        field: "input",
      },
    ],
  },
});

module.exports = {
  async flexSearch(query) {
    //console.log(doc);
    // connect and await
    await database.connect();
    // pass database instance as option
    const db = new MongoDB("wgeteer", {
      db: database,
    });
    await document.mount(db);
    // await document.destroy();
    const result = await document.search({
      field: "content",
      query: "ppengo",
      limit: 100,
      suggest: true,
    });
    console.log(result);
    return result;
  },
};
