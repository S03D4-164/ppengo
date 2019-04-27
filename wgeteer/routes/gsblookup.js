var request = require('request');
var qs = require('querystring');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Website = require('./models/website');

module.exports = {
    async lookup (id){
        var website = await Website.findById(id)
        .then((doc) => {
            return doc;
        })
        .catch(err =>{
          console.log(err);
        });

        var ApiEndpoint = 'http://127.0.0.1:3001/v4/threatMatches:find';
        var submit = {
            "threatInfo": {
                "threatEntries": [
                    {"url": website.url},
                ]
            }
        }
        var options = {
            url: ApiEndpoint,
            json: submit,
        }
        await request.post(options, async function (error, response, body) {
            console.log(response.statusCode, body.length, JSON.stringify(body));
            if ("matches" in body){
                website.gsb.lookup = body;
            }else{
                website.gsb.lookup = {"matches":false};
            }
            await website.save();
        })
    },
};
