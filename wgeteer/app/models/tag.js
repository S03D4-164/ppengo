const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const tagSchema = new mongoose.Schema({
    key: {
        type: String,
        lowercase: true,
        trim: true,
        required: true,
    },
    value: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
},{timestamps:true},
);

tagSchema.index({createdAt:-1});
tagSchema.index({key: 1, value: 1}, {unique: true});
tagSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Tag', tagSchema);