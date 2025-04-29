const logger = require("../modules/logger");
const gsblookup = require("../modules/gsblookup");

module.exports = async (agenda) => {
  agenda.define("gsblookup", async (job, done) => {
    logger.debug(job.attrs);
    const result = await gsblookup.lookupSite(job.attrs.data.websiteId);
    logger.debug(result);
    //await agenda.now("gsbUrlResult", { result: result });
    done();
  });
};
