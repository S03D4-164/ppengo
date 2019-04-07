const mongoose = require('mongoose');

const screenshotSchema = new mongoose.Schema({
    screenshot: {
        type: String,
        required: true,
    },
    md5: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
},
{timestamps:true},
);

module.exports = mongoose.model('Screenshot', screenshotSchema);
    