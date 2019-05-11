const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const payloadSchema = new mongoose.Schema({
    payload: {
        type: Buffer,
    },
    md5: {
        type: String,
        unique: true,
    },
    vt: {
        type: Object,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    tag: {
        type: [Object]
    },
},{timestamps:true},
);

payloadSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Payload', payloadSchema);
 