const findProc = require("find-process");

async function psChrome(pageId) {
  let pslist;
  try {
    pslist = await findProc("name", "chrome").then(
      function (list) {
        //console.log(list, list.length);
        for (let ps of list) {
          if (ps.name === "chrome") {
            if (pageId > 0) {
              if (ps.cmd.match("/tmp/" + pageId)) {
                console.log("kill", ps);
                process.kill(ps.pid);
              }
            } else {
              console.log("kill", ps);
              process.kill(ps.pid);
            }
          }
        }
        return list;
      },
      function (err) {
        console.log(err.stack || err);
      },
    );
    if (pageId == -1) {
      pslist = await findProc("name", "chrome").then(function (list) {
        return list;
      });
    }
  } catch (err) {
    //logger.error(err);
    console.log(err);
  }
  console.log(pslist);
  return pslist;
}

module.exports = psChrome;
