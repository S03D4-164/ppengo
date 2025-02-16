const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const gsbchema = new mongoose.Schema({
    api: {
        type: String,
    },
    url: {
        type: String,
        trim: true,
        required: true,
        unique: true,
    },
    urlHash: {
        type: String,
    },
    result: {
        type: Object,
    },
  },
  {timestamps:true},
);

gsbSchema.plugin(mongoosePaginate);

gsbSchema.index({createdtedAt:-1});
gsbSchema.index({urlHash:1});

module.exports = mongoose.model('gsb', gsbSchema);
 