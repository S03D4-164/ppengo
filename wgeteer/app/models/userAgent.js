const mongoose = require('mongoose');

const userAgentSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
    },
    userAgent: {
        type: String,
        trim: true,
    },  
});

const data = [
    { 
        "name":"win10-chrome",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
    },
]
var UserAgent = mongoose.model('UserAgent', userAgentSchema);
UserAgent.collection.insertMany(data, function(err,r) {
    if(err)console.error(err);
});