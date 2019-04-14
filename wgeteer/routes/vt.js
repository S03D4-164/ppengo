var request = require('request');
var qs = require('querystring');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Payload = require('./models/payload');

module.exports = {
    async vt (payloadId){
        var payload = await Payload.findById(payloadId)
        .then((doc) => {
            return doc;
        })
        .catch(err =>{
          console.log(err);
        });

        var resource = payload.md5;
        console.log(resource);

        var ak = '';
        var vtApiEndpoint = 'https://www.virustotal.com/vtapi/v2/';

        var method = "file"
        var arg = {
            apikey:ak,
            resource:resource,
        }
        var options = {
            url: vtApiEndpoint + method + '/report?' + qs.stringify(arg),
            json: true,
        }
        await request(options, async function (error, response, body) {
            console.log(body);
            if (body){
                payload.vt = body;
                await payload.save();
            }
    
        })
    },
};
