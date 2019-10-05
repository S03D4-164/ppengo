const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

module.exports = createLogger({
  format: combine(
    label({ label: 'wgeteer' }),
    timestamp(),
    prettyPrint()
  ),
  transports: [
      new transports.File({
          level: 'info',
          filename: './public/logs/ppengo.log',
          handleExceptions: true,
          json: false,
          maxsize: 5242880, //5MB
          maxFiles: 5,
          colorize: false,
          timestamp:true
        }),
      new transports.Console({
          level: 'debug',
          handleExceptions: true,
          json: false,
          colorize: true,
          timestamp:true
      })
  ],
  exitOnError: false
});
