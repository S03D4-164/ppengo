var express = require('express');
var router = express.Router();
var paginate = require('express-paginate');

const Response = require('./models/response');
const Website = require('./models/website');
const Webpage = require('./models/webpage');
const Payload = require('./models/payload');
const Request = require('./models/response');

var ObjectId = require('mongoose').Types.ObjectId

const json2csv = require('json2csv');

RegExp.escape= function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
RegExp.prototype.toJSON = RegExp.prototype.toString;

router.get('/page', function(req, res) {
  var search = []
  if(typeof req.query.input !== 'undefined' && req.query.input){
    search.push({"input": req.query.input});
  }
  if(typeof req.query.rinput !== 'undefined' && req.query.rinput){
    search.push({"input": new RegExp(RegExp.escape(req.query.rinput))});
  }

  if(typeof req.query.title !== 'undefined' && req.query.title){
    search.push({"title": new RegExp(req.query.title)});
  }
  if(typeof req.query.url !== 'undefined' && req.query.url){
    search.push({"url": req.query.url});
  }
  if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
    search.push({"url":new RegExp(req.query.rurl)});
  }

  if(typeof req.query.source !== 'undefined' && req.query.source){
    search.push({"content": new RegExp(req.query.source)});
  }
  if(typeof req.query.ip !== 'undefined' && req.query.ip){
      search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
  }
  if(typeof req.query.country !== 'undefined' && req.query.country){
    search.push({"remoteAddress.geoip.country":new RegExp(req.query.country)});
  }
  if(typeof req.query.status !== 'undefined' && req.query.status){
    search.push({"$where": `/${req.query.status}/.test(this.status)`});
  }

  console.log(req.query, search);
  var find = Webpage.find();
  if(search.length)find = find.and(search);
  find.sort("-createdAt")
  .then((webpage) => {
      if(typeof req.query.csv !== 'undefined' && req.query.csv){
        var fields = ['createdAt', 'input', 'title', 'error', 'status', 'remoteAddress.ip', 'remoteAddress.reverse', 'remoteAddress.geoip', 'wappalyzer', 'securityDetails.issuer', 'securityDetails.validFrom', 'securityDetails.validTo', 'url'];
        const csv = json2csv.parse(webpage, { fields });
        res.setHeader('Content-disposition', 'attachment; filename=webpages.csv');
        res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
        res.send(csv);
      }else{
        res.render('pages', { 
          title: "Page: "+ JSON.stringify(req.query),
          webpages:webpage,
          search:req.query,
        });
    }
    });
});

router.get('/website', function(req, res) {
  var search = []
  if(typeof req.query.tagkey !== 'undefined' && req.query.tagkey){
    var elem = {};
    elem[req.query.tagkey] = {"$regex":"^.*$"};
    if(typeof req.query.tagval !== 'undefined' && req.query.tagval){
      elem[req.query.tagkey] = req.query.tagval;
    }
    search.push({"tag": {"$elemMatch":elem}});
  }

  if(typeof req.query.tag !== 'undefined' && req.query.tag){
    var elem = {};
    elem[req.query.tagkey] = {"$regex":"^.*$"};
    if(typeof req.query.tagval !== 'undefined' && req.query.tagval){
      elem[req.query.tagkey] = req.query.tagval;
    }
    search.push({"tag": {"$elemMatch":elem}});
  }

  if(typeof req.query.url !== 'undefined' && req.query.url){
    search.push({"url": req.query.url});
  }

  if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
    //search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    search.push({"url":new RegExp(req.query.rurl)});

  }

  if(typeof req.query.track !== 'undefined' && req.query.track){
    search.push({"track.counter": {"$gt":0}});
  }

  if(typeof req.query.gsb !== 'undefined' && req.query.gsb){
    var elem = {"threatType": new RegExp(req.query.gsb, "i")};
    search.push({"gsb.lookup.matches": {"$elemMatch":elem}});
  }

  console.log(search);
  var find = Website.find();
  if(search.length)find = find.and(search);
  find.sort("-createdAt").populate("last")
  .then((websites) => {
      var tmp = []
      if(typeof req.query.tagval !== 'undefined' && req.query.tagval){
        for (let site of websites){
          console.log(site)
          if(site.tag.length){
            for (let tag of site.tag){
              for (let key in tag){
                if(tag[key]===req.query.tagval)tmp.push(site)
                break;
              }   
            }
          }
        } 
        if (tmp) websites = tmp
      }

      if(typeof req.query.csv !== 'undefined' && req.query.csv){
        var fields = ['createdAt', 'updatedAt', 'url', 'tag', 'gsb.lookup'];
        const csv = json2csv.parse(websites, { fields });
        res.setHeader('Content-disposition', 'attachment; filename=websites.csv');
        res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
        res.send(csv);
      }else{
        res.render('websites', { 
          title: "Website",
          search:req.query,
          websites,
        });
      }
    })
});

router.get('/request', function(req, res) {
  var search = []
  if(typeof req.query.url !== 'undefined' && req.query.url){
    search.push({"url":new req.query.url});
  }
  Request.find()
  .and(search).sort("-createdAt")
  .limit(100)
  .then((webpage) => {
      res.render('requests', { 
        title: "Search: "+ JSON.stringify(req.query),
        webpages:webpage,
      });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.get('/response', function(req, res) {
  var search = []
    if(typeof req.query.url !== 'undefined' && req.query.url){
      search.push({"url": req.query.url});
    }
    if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
      search.push({"url":new RegExp(req.query.rurl)});
    }

    if(typeof req.query.ip !== 'undefined' && req.query.ip){
      search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
    }
    if(typeof req.query.country !== 'undefined' && req.query.country){
      search.push({"remoteAddress.geoip.country":new RegExp(req.query.country)});
    }
    if(typeof req.query.issuer !== 'undefined' && req.query.issuer){
      search.push({"securityDetails.issuer":new RegExp(req.query.issuer)});
    }
    if(typeof req.query.source !== 'undefined' && req.query.source){
      search.push({"text":new RegExp(req.query.source)});
    }

    if(typeof req.query.status !== 'undefined' && req.query.status){
      search.push({"status":req.query.status});
    }

    if(typeof req.query.webpage !== 'undefined' && req.query.webpage){
      search.push({"webpage": new ObjectId(req.query.webpage)});
    }

    console.log(req.query, search);
    var find;
    if (search.length){
      find =  Response.find().and(search);
    }else{
      find =  Response.find();

    }
    //Response.find().and(search)
    find
    .sort("-createdAt").limit(100)
    .then((webpage) => {
        res.render('responses', { 
          webpages:webpage,
          search:req.query,
        });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
});

router.get('/payload', function(req, res) {
    var search = []
    if(typeof req.query.md5 !== 'undefined' && req.query.md5 !== null){
      search.push({"md5":new RegExp(req.query.md5)});
    }

    Payload
    .find()
    .and(search)
    .sort("-createdAt")
    .then((payloads) => {
      res.render(
        'payloads', {
          payloads,
        });
    });
  });

  module.exports = router;
