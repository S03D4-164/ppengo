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
    fileType: {
        type: String,
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
    yara:{
        type: Object,
    },
},{timestamps:true},
);

payloadSchema.index({createdAt:-1});
payloadSchema.index({md5:1});
payloadSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Payload', payloadSchema);
 