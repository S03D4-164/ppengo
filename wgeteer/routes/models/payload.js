const mongoose = require('mongoose');

const payloadSchema = new mongoose.Schema({
    payload: {
        type: Buffer,
    },
    hash:{
        md5: {type: String}
    }
});

module.exports = mongoose.model('Payload', payloadSchema);
    