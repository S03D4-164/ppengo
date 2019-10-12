const mongoose = require('mongoose');
const logger = require('./logger')

const mongoConnectionString = 'mongodb://127.0.0.1:27017/wgeteer';

/*
mongoose.connection.on('connecting', ()=>{console.log("[mongoose] connecting.")});
mongoose.connection.on('connected', ()=>{console.log("[mongoose] connected.")});
mongoose.connection.on('disconnecting', ()=>{console.log("[mongoose] disconnecting.")});
mongoose.connection.on('disconnected', ()=>{console.log("[mongoose] disconnected.")});
mongoose.connection.on('reconnected', ()=>{console.log("[mongoose] reconnected.")});
mongoose.connection.on('reconnectFailed', ()=>{console.log("[mongoose] reconnect failed.")});
mongoose.connection.on('error', (err)=>{console.log("[mongoose] error", err)});
*/

//mongoose.connect('mongodb://127.0.0.1:27017/wgeteer', {
mongoose.connect(mongoConnectionString, {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoReconnect:true,
  reconnectInterval: 5000,
  reconnectTries: 60,
  useFindAndModify: false,
}).then(() =>  logger.debug('[mongoose] connect completed'))
.catch((err) => logger.debug('[mongoose] connect error', err));

const Agenda = require('agenda');
const connectionOpts = {
    db: {
        address: mongoConnectionString,
        collection: 'agendaJobs',
        options: {
            useNewUrlParser: true,
        },
    },
    processEvery: '5 seconds'
};

const agenda = new Agenda(connectionOpts);

const wgeteer = require('./wgeteer')

agenda.define('wgeteer', async (job, done) => {
    const {pageId, previous} = job.attrs.data;
    await wgeteer.wget(pageId);
    agenda.now('analyzePage', {pageId: pageId});
    done();
});
    
agenda.define('hello world', function(job, done) {
    logger.debug('agenda ready');
    done();
});

agenda.on('ready', function () {
    agenda.now('hello world', {time: new Date()});
    agenda.start();
});

agenda.on('start', job => {
    logger.info(`Job starting ${job.attrs.name}`);
});

agenda.on('complete', job => {
    logger.info(`Job ${job.attrs.name} finished`);
});

agenda.on('success:wgeteer', job => {
    logger.info(`Wgeteer Successfully to ${job.attrs.data.pageId}`);
});

agenda.on('fail:wgeteer', (err, job) => {
    logger.info(`Job failed with error: ${err.message}`);
});

module.exports = {
    agenda,
}