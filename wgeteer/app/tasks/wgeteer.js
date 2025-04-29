const logger = require("../modules/logger");
const wgeteer = require("../modules/wgeteer");

module.exports = async (agenda) => {
  agenda.define("wgeteer", async (job, done) => {
    console.log(job.attrs.data);
    const data = job.attrs.data;
    if (data.count > 1) {
      logger.error(`wgeteer failed: ${data.pageId}`);
      done();
    } else {
      job.attrs.data.count += 1;
      job.save();
    }
    await wgeteer.wget(data.pageId);
    agenda.now("analyzePage", { pageId: data.pageId });
    done();
  });
};
