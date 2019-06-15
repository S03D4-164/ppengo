const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const tagSchema = new mongoose.Schema({
    key: {
        type: String,
    },
    value: {
        type: String,
    },
    description: {
        type: String,
    },
},{timestamps:true},
);

tagSchema.index({createdAt:-1});
tagSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Tag', tagSchema);