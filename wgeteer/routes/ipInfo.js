//const whois = require('node-xwhois');
const whois = require("./node-xwhois/whois");
//const geoip = require('geoip-lite');
const ip2loc = require("ip2location-nodejs");

//var redis = require('redis');
const Response = require("./models/response");
const logger = require("./logger");

const getIpinfo = async function (host) {
  const ip = await whois
    .extractIP(host)
    .then((info) => {
      return info[0];
    })
    .catch((err) => {
      logger.error(err);
      return;
    });
  if (whois.isIP(ip)) {
    /*
        const client = await redis.createClient();
        client.on('connect', function() {
            console.log('Redis client connected');
        });
        client.on('error', function (err) {
            console.log('Something went wrong ' + err);
        });
        var who = await client.get(host, function (error, result) {
            if (error) console.log(error);
            //console.log('GET result ->' + result);
            return result;
        });

        //if (!ipInfo){
        if (!who){
            who = await whois.whois(host)
            //if (who) client.set(host, who, redis.print);    
        }
        */
    //const who = await whoisCache(host);
    const reverses = await whois
      .reverse(ip)
      .then((info) => {
        logger.debug(info);
        return info;
      })
      .catch((err) => {
        logger.error(err);
      });
    const hostnames = Array.from(new Set(reverses));

    const bgp = await whois
      .bgpInfo(ip)
      .then((info) => {
        logger.debug(info);
        return info;
      })
      .catch((err) => {
        logger.error(err);
      });

    var geo = {};
    try {
      //geo = await geoip.lookup(ip);
      //ip2loc.IP2Location_init("./IP2LOCATION-LITE-DB1.IPV6.BIN");
      ip2loc.IP2Location_init("/tmp/IP2LOCATION-LITE-DB1.IPV6.BIN");
      const country = ip2loc.IP2Location_get_country_short(ip);
      const country_long = ip2loc.IP2Location_get_country_long(ip);
      geo = {
        country: country,
        country_long: country_long,
      };
      logger.debug(geo);
    } catch (error) {
      logger.error("[GeoIP] error: " + error.message);
    }

    let ipInfo = {
      //'whois': who,
      reverse: hostnames,
      bgp: bgp,
      geoip: geo,
      ip: ip,
    };

    /*
        //client.set(host, ipInfo, 'EX', 30000);
        await client.set(host, who, 'EX', 30000);

        await client.quit();
        */
    return ipInfo;
  }
  return;
};

module.exports = {
  async getHostInfo(host) {
    const hostinfo = await getIpinfo(host);
    return hostinfo;
  },
  async setResponseIp(responses) {
    var ips = {};
    for (let seq in responses) {
      //var response = responses[seq];
      if (responses[seq].remoteAddress.ip) {
        let ip = responses[seq].remoteAddress.ip;
        if (ip in ips) {
          ips[ip].push(responses[seq]);
        } else {
          ips[ip] = [responses[seq]];
        }
        ip = null;
      }
    }
    for (let ip in ips) {
      let hostinfo = await getIpinfo(ip);
      if (hostinfo) {
        //console.log(hostinfo);
        //var responseArray = ips[ip];
        //for (let num in responseArray){
        for (let num in ips[ip]) {
          //var res = responseArray[num];
          var res = ips[ip][num];
          var remoteAddress = {};
          if (hostinfo.reverse) remoteAddress.reverse = hostinfo.reverse;
          if (hostinfo.bgp) remoteAddress.bgp = hostinfo.bgp;
          if (hostinfo.geoip) remoteAddress.geoip = hostinfo.geoip;
          if (hostinfo.ip) remoteAddress.ip = hostinfo.ip;
          else remoteAddress.ip = ip;

          //res.save();
          //res = null;
          await Response.findOneAndUpdate(
            { _id: res._id },
            {
              remoteAddress: remoteAddress,
            },
          );
          res = null;
          remoteAddress = null;
        }
      }
      hostinfo = null;
    }
    ips = null;
    return;
  },
};
