const mongoose = require('mongoose');

const screenshotSchema = new mongoose.Schema({
    screenshot: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('Screenshot', screenshotSchema);
    