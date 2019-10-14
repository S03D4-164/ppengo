const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const websiteSchema = new mongoose.Schema({
    url: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    track: {
        period: {type: Number, default: 0 },
        counter: {type: Number, default: 0 },
        option:{
            type: Object,
        },
    },
    tag: {
        type: [Object]
    },
    gsb: {
        lookup:{
            type: Object,
        }
    },
    group  : [String],
    last : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
},
{timestamps:true},
);

websiteSchema.index({updatedAt:-1});
websiteSchema.index({url:1});

websiteSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Website', websiteSchema);