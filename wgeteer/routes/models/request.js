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
    errorText:{type:String},
  },
  status: {
    type: String,
  },
  headers: {
    type: Object,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  webpage : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
});

module.exports = mongoose.model('Request', requestSchema);
