const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
 
const UserSchema =  new mongoose.Schema({
    username  : {
        type:String,
        required: true,
        unique: true,
    },
    password  : {
        type:String,
    },
    active    : Boolean,
    role  : [String],
    admin: {
        type:Boolean,
        default:false
    },
    apikey: String
});

UserSchema.plugin(passportLocalMongoose);
 
module.exports = mongoose.model('User', UserSchema);