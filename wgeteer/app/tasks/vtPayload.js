const logger = require("../modules/logger");
const vt = require("../modules/vt");

module.exports = async (agenda) => {
  agenda.define("vtPayload", async (job, done) => {
    logger.debug(job.attrs);
    await vt
      .vtPayload(job.attrs.data.payloadId)
      .then((success) => {
        console.log("vtPayload success", success);
      })
      .catch((err) => {
        console.log("vtPayload error", err);
      });
    done();
  });
};
