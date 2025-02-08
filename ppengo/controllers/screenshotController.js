const Screenshot = require("../routes/models/screenshot");

exports.screenshots = (req, res) => {
  //const now = date.now();
  Screenshot.find()
    .lean()
    .sort("-createdAt")
    .limit(100)
    .then((payloads) => {
      //console.log(websites);
      res.render("screenshots", {
        title: "Screenshot",
        payloads,
        //csrfToken:req.csrfToken(),
      });
    })
    .catch((err) => {
      //console.log(err);
      res.send(err);
    });
};

exports.screenshot = (req, res) => {
  const id = req.params.id;
  //console.log(id);
  Screenshot.findById(id)
    .lean()
    .then((webpage) => {
      //console.log(webpage);
      var img = new Buffer.from(webpage.screenshot, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": img.length,
      });
      res.end(img);
    });
};

