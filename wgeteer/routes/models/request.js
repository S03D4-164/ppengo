const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  url: {
    type: String,
  },
  method: {
    type: String,
  },
  resourceType: {
    type: String,
  },
  isNavigationRequest:{
    type:Boolean,
  },
  postData: {
    type: String,
  },
  failure:{
    type: Object,
  },
  headers: {
    type: Object,
  },
  redirectChain: {
    type:[String],
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  webpage : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
  response : { type: mongoose.Schema.Types.ObjectId, ref: 'Response' },
});

module.exports = mongoose.model('Request', requestSchema);
