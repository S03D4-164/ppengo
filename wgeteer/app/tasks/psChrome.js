const logger = require("../modules/logger");
const findChrome = require("../modules/findproc");

module.exports = async (agenda) => {
  agenda.define("psChrome", async function (job, done) {
    await job.setShouldSaveResult(true);
    const ps = await findChrome();
    job.attrs.data = ps;
    await job.save();
    done();
  });
};
