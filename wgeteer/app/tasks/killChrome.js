const logger = require("../modules/logger");
const findChrome = require("../modules/findproc");

module.exports = async (agenda) => {
  agenda.define("killChrome", async function (job, done) {
    await job.setShouldSaveResult(true);
    const ps = await findChrome(-1);
    job.attrs.data = ps;
    await job.save();
    done();
  });
};
