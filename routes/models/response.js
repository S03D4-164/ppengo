const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    url: {
      type: String,
      trim: true,
    },
    status: {
        type: String,
        trim: true,
    },
    payload: {
      type: Buffer,
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    webpage : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
  });

module.exports = mongoose.model('Response', responseSchema);
