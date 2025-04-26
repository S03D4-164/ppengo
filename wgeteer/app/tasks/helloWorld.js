const logger = require("../modules/logger");

module.exports = async (agenda) => {
  agenda.define("hello world", function (job, done) {
    logger.debug("agenda ready");
    done();
  });
};
