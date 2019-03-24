const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema({
    url: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    track: {
        period: {type: Number },
        counter: {type: Number },
        option:{
            type: Object,
        },
    },
    tag: {
        type: [String]
    },
    /*
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    */
    last : { type: mongoose.Schema.Types.ObjectId, ref: 'Webpage' },
},{timestamps:true},
);

/*
websiteSchema.pre('findOneAndUpdate', function preSave(next){
    var self = this;
    self.updatedAt = new Date;
    next();
});
*/

module.exports = mongoose.model('Website', websiteSchema);