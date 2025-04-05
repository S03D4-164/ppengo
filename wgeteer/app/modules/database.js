const mongoose = require("mongoose");
const logger = require("./logger");

const mongoConnectionString = "mongodb://127.0.0.1:27017/wgeteer";

var db = mongoose.createConnection(mongoConnectionString, {
  //useUnifiedTopology: true,
  //useNewUrlParser: true,
  //useCreateIndex: true,
  //useFindAndModify: false,
});

async function closeDB() {
  try {
    const modelNames = Object.keys(db.models);
    modelNames.forEach((modelName) => {
      delete db.models[modelName];
      logger.debug("deleted model " + modelName);
    });

    const collectionNames = Object.keys(db.collections);
    collectionNames.forEach((collectionName) => {
      delete db.collections[collectionName];
      logger.debug("deleted collection " + collectionName);
    });
    /*
    const modelSchemaNames = Object.keys(db.base.modelSchemas);
    modelSchemaNames.forEach((modelSchemaName) => {
      delete db.base.modelSchemas[modelSchemaName];
      logger.debug("deleted schema " + modelSchemaName);
    });
    */
  } catch (err) {
    logger.error(err);
  }
}

module.exports = { db, closeDB };
