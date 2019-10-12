const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

const prettyJson = format.printf(info => {
  if (info.message.constructor === Object) {
    info.message = JSON.stringify(info.message, null, 4)
  }
  return `${info.timestamp} [${info.level}] ${info.message}`
})

module.exports = createLogger({
  format: combine(
    label({ label: 'wgeteer' }),
    timestamp(),
    prettyPrint(),
    format.splat(),
    format.simple(),
    prettyJson,
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
