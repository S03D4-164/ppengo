const mongoose = require('mongoose');

const webpageSchema = new mongoose.Schema({
  input: {
    type: String,
    trim: true,
    required: true,
  },
  option:{
    type: Object,
  },
  url: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
  },
  error: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
  content: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: Number,
  },
  remoteAddress: {
    ip: {type: String},
    port: {type: Number},
    reverse: {type: [String]},
    bgp: {type: [Object]},
    whois: {type: String},
    geoip: {type: [Object]},
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
  requests : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Request' }],
  responses : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Response' }],
  //response : { type: mongoose.Schema.Types.ObjectId, ref: 'Response' },
  screenshot : { type: mongoose.Schema.Types.ObjectId, ref: 'Screenshot' },
});

webpageSchema.index({createdAt:-1});
webpageSchema.index({content:'text'});

module.exports = mongoose.model('Webpage', webpageSchema);
