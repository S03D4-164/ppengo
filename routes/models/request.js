const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  url: {
    type: String,
    trim: true,
  },
  method: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  webpage : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
});

module.exports = mongoose.model('Request', requestSchema);
