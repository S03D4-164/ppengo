const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    url: {
      type: String,
    },
    status: {
        type: Number,
    },
    payload: {
      type: Buffer,
    },
    statusText: {
      type: String,
    },
    ok: {
      type: Boolean,
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
  });

module.exports = mongoose.model('Response', responseSchema);
