const whois = require('node-xwhois');
var geoip = require('geoip-lite');
//var redis = require('redis');

const getIpinfo = async function(host){
    const ip = await whois.extractIP(host)
        .then(info => {return info[0]})
        .catch(err => console.log(err));
    if (whois.isIP(ip)){
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
        var reverses = await whois.reverse(ip)
            .then(info => {return info})
            .catch(err => console.log(err));
        var hostnames  = Array.from(new Set(reverses))

        var bgp = await whois.bgpInfo(ip)
            .then(info => {return info})
            .catch(err => console.log("[bgp] error: " + ip));

        var geo = {}
        try{
            geo = await geoip.lookup(ip);

        }catch(error){
            console.log("[GeoIP] error: " + ip);
        }

        ipInfo = {
            //'whois': who,
            'reverse': hostnames,
            'bgp': bgp,
            'geoip': geo,
            'ip': ip,
        }
        /*
        //client.set(host, ipInfo, 'EX', 30000);
        await client.set(host, who, 'EX', 30000);

        await client.quit();
        */
        return ipInfo;
    }
    return;
}

module.exports = {
    async getHostInfo (host){
        const hostinfo = await getIpinfo(host); 
        return hostinfo;
    },
    async setResponseIp (responses){
        var ips = {};
        for (let seq in responses){
            var response = responses[seq];
            if (response.remoteAddress.ip){
                var ip = response.remoteAddress.ip;
                if(ip in ips){
                    ips[ip].push(response);
                }else{
                    ips[ip] = [response];
                }
            }
        }
        for (let ip in ips){
            //console.log(ip);
            const hostinfo = await getIpinfo(ip); 
            if(hostinfo){
                console.log(hostinfo);
                var responseArray = ips[ip];
                for (let num in responseArray){
                    var res = responseArray[num];
                    if (hostinfo.reverse) res.remoteAddress.reverse = hostinfo.reverse;
                    if (hostinfo.bgp) res.remoteAddress.bgp = hostinfo.bgp;
                    if (hostinfo.geoip) res.remoteAddress.geoip = hostinfo.geoip;
                    if (hostinfo.ip) res.remoteAddress.ip = hostinfo.ip;
                    res.save();
                }
            }  
        }
        return;
    },
}