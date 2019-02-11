const mongoose = require('mongoose');

const browserSchema = new mongoose.Schema({
    url: {
        type: String,
        trim: true,
    },
    page: {

    },
    created_at: {
        type: Date,
        default: Date.now
    },
});
    
module.exports = mongoose.model('Browser', browserSchema);
  