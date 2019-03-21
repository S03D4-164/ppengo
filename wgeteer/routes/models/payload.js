const mongoose = require('mongoose');

const payloadSchema = new mongoose.Schema({
    payload: {
        type: Buffer,
    },
    md5: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

/*
payloadSchema.static('findOneOrCreate', async function findOneOrCreate(condition, doc) {
    const one = await this.findOne(condition);
    return one || await this.create(doc);
});
*/

module.exports = mongoose.model('Payload', payloadSchema);
 