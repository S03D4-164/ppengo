var request = require('request-promise');
var qs = require('querystring');

const Payload = require('./models/payload');

const ak = '';
const vtApiEndpoint = 'https://www.virustotal.com/vtapi/v2/';

async function vtFileReport(resource){
    var arg = {
        apikey:ak,
        resource:resource,
    }
    var options = {
        url: vtApiEndpoint + 'file/report?' + qs.stringify(arg),
        json:true,
        method:"GET"
    }
    console.log(options);
    var res = await request(options)
    .then((body)=>{
        //console.log(body);
        return body;
    })
    .catch((err)=>{
        console.log(err);
        return {"error":err.message};
    })
    return res;
}

module.exports = {
    async vt (resource){
        const body = await vtFileReport(resource);
        return body;
    },
    async vtPayload (payloadId){
        var result = await Payload.findById(payloadId)
        .then(async (payload) => {
            var resource = payload.md5;
            const body = await vtFileReport(resource);
            payload.vt = body;
            await payload.save();
            return body;    
        })
        .catch(err =>{
            console.log(err);
            return {"error":err.message};
        });
        return result;
    },
};
