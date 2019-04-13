const mongoose = require('mongoose');

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
    last : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
},
{timestamps:true},
);

websiteSchema.index({updatedAt:-1});

module.exports = mongoose.model('Website', websiteSchema);