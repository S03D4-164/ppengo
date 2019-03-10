const mongoose = require('mongoose');

const screenshotSchema = new mongoose.Schema({
    screenshot: {
        type: String,
    },
});

module.exports = mongoose.model('Screenshot', screenshotSchema);
    