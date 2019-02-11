const mongoose = require('mongoose');

const webpageSchema = new mongoose.Schema({
  input: {
    type: String,
    trim: true,
  },
  url: {
    type: String,
    trim: true,
  },
  title: {
      type: String,
  },
  screenshot: {
    type: String,
    trim: true,
  },
  thumbnail: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  //requests : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Request' }],
  //responses : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Response' }],
});
  
module.exports = mongoose.model('Webpage', webpageSchema);
