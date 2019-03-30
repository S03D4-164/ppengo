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
        type: [String]
    },
    last : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
},
{timestamps:true},
);

module.exports = mongoose.model('Website', websiteSchema);