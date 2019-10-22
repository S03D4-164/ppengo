const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
//const mongoosastic = require('mongoosastic')
const mexp = require('mongoose-elasticsearch-xp').v7;

const responseSchema = new mongoose.Schema({
    url: {
      type: String,
      es_indexed:true,
    },
    urlHash: {
      type: String,
    },
    status: {
      type: Number,
    },
    statusText: {
      type: String,
    },
    ok: {
      type: Boolean,
    },
    text: {
      type: String,
      es_indexed:true,
    },
    remoteAddress: {
      ip: {type: String},
      port: {type: Number},
      reverse: {type: [String]},
      bgp: {type: [Object]},
      geoip: {type: [Object]},
      //whois: {type: String},
    },
    headers: {
      type: Object,
    },
    securityDetails: {
      issuer: {type: String},
      protocol: {type: String},
      subjectName: {type: String},
      validFrom: {type: Number},
      validTo: {type: Number},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      es_indexed:true,
    },
    wappalyzer: {
      type: [String]
    },
    yara:{
      type: Object,
    },
    webpage : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
    request : { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    payload : { type: mongoose.Schema.Types.ObjectId, ref: 'Payload' },

});

responseSchema.index({createdAt:-1});
responseSchema.index({urlHash:1});
responseSchema.index({payload:1});
responseSchema.index({text:'text'});
responseSchema.index({webpage:1});
responseSchema.index({"remoteAddress.ip":1});

responseSchema.plugin(mongoosePaginate);
//responseSchema.plugin(mongoosastic,{
responseSchema.plugin(mexp,{
  hosts: [
    'elasticsearch:9200',
    '127.0.0.1:9200',
  ],
  //hydrate:true,
  //hydrateOptions: {lean: true},
  //hydrateWithESResults: {source: false},
})

module.exports = mongoose.model('Response', responseSchema);
