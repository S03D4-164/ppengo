const logger = require("../modules/logger");
const gsblookup = require("../modules/gsblookup");

module.exports = async (agenda) => {
  agenda.define("gsblookupUrl", async (job, done) => {
    logger.debug(job.attrs);
    const result = await gsblookup.lookupUrl(job.attrs.data.url);
    logger.debug(result);
    await agenda.now("gsbUrlResult", { result: result });
    done();
  });
};
