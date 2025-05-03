const superagent = require('superagent');
const qs = require('querystring');

const Payload = require('../models/payload');

const ak = process.env.VTKEY;
const vtApiEndpoint = 'https://www.virustotal.com/vtapi/v2/';

async function vtFileReport(resource) {
    const arg = {
        apikey: ak,
        resource: resource,
    };
    const url = vtApiEndpoint + 'file/report?' + qs.stringify(arg);

    try {
        console.log({ url });
        const res = await superagent.get(url).set('Accept', 'application/json');
        console.log(res.body);
        return res.body;
    } catch (err) {
        console.log(err);
        return { error: err.message };
    }
}

module.exports = {
    async vt(resource) {
        const body = await vtFileReport(resource);
        return body;
    },
    async vtPayload(payloadId) {
        const result = await Payload.findById(payloadId)
            .then(async (payload) => {
                const resource = payload.md5;
                console.log(resource);
                const body = await vtFileReport(resource);
                payload.vt = body;
                await payload.save();
                return body;
            })
            .catch((err) => {
                console.log(err);
                return { error: err.message };
            });
        return result;
    },
};
