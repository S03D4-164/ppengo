const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    url: {
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
    },
    payload: {
      type: Buffer,
    },
    remoteAddress: {
      ip: {type: String},
      port: {type: Number}
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
      default: Date.now
    },
    webpage : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
    request : { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
  });

 responseSchema.index({text:'text'});

module.exports = mongoose.model('Response', responseSchema);
