const mongoConnectionString = 'mongodb://mongodb/agenda';

const Agenda = require('agenda');
const agenda = new Agenda();

agenda.processEvery('5 seconds');
agenda.database('mongodb/wgeteer', 'agendaJobs');

agenda.define('hello world', function(job, done) {
    console.log(job.attrs.data.time, 'hello world!');
    done();
});

agenda.on('ready', function () {
    agenda.now('hello world', {time: new Date()});
    agenda.start();
});

agenda.on('start', job => {
    console.log('Job %s starting', job.attrs.name);
});

agenda.on('complete', job => {
    console.log(`Job ${job.attrs.name} finished`);
});

module.exports = agenda;
