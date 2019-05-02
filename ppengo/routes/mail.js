const nodemailer = require("nodemailer");

module.exports = {
    async sendMail (message){
        var smtp = nodemailer.createTransport({
            host: '172.17.0.1',
            port: 25,
            secure:false,
            tls: {
                rejectUnauthorized: false
            }
        });
        try{
            smtp.sendMail(message, function(error, info){
                if(error) console.log("send failed", error);
                if(info) console.log("send successful", info.messageId);
            });
        }catch(e) {
            console.log("Error ",e);
        }
    }
}
