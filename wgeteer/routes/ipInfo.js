const whois = require('node-xwhois');
var geoip = require('geoip-lite');
//var redis = require('redis');

const getIpinfo = async function(host){
    if (whois.isIP(host)){
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
        var hostnames = [];
        try{
            hostnames = await whois.reverse(host);
        }catch(error){
            console.log(error);
        }

        var bgp = [];
        try{
            bgp = await whois.bgpInfo(host);
        }catch(error){
            console.log("[GeoIP] error: " + host);
        }

        var geo = {}
        try{
            geo = await geoip.lookup(host);

        }catch(error){
            console.log(error);
        }

        //ipInfo = JSON.stringify({
        ipInfo = {
            //'whois': who,
            'reverse': hostnames,
            'bgp': bgp,
            'geoip': geo,
        }
        //);
        //console.log(ipInfo);
        /*
        //client.set(host, ipInfo, 'EX', 30000);
        await client.set(host, who, 'EX', 30000);

        await client.quit();
        */
        return ipInfo;
    }
    return;
}

module.exports = getIpinfo;
