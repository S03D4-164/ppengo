const mongoose = require('mongoose');

const webpageSchema = new mongoose.Schema({
  input: {
    type: String,
    trim: true,
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
  //screenshot: {    type: String,  },
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
  //requests : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Request' }],
  //responses : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Response' }],
  //response : { type: mongoose.Schema.Types.ObjectId, ref: 'Response' },
  screenshot : { type: mongoose.Schema.Types.ObjectId, ref: 'Screenshot' },
});

webpageSchema.index({content:'text'});

module.exports = mongoose.model('Webpage', webpageSchema);
