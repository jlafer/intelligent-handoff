const fs = require('fs');
const path = require('path');

const logLevels = {
  DEBUG: 4,
  INFO: 3,
  WARN: 2,
  ERROR: 1
};

const LogService = (function () {
  let logFilePath;
  let logLevel = 3;

  return {
    open: function (level, filePath) {
      if (level in logLevels) {
        logLevel = logLevels[level];
      }
      logFilePath = filePath || path.join(__dirname, 'app.log');
      this.log(`Log file ${logFilePath} opened at level ${logLevel}`);
    },
    log: function (message) {
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} - ${message}\n`;
      console.log(message);
      fs.appendFileSync(logFilePath, logMessage, 'utf-8');
    },
    debug: function (message) {
      if (logLevel >= 4)
        this.log(`DEBUG: ${message}`);
    },
    info: function (message) {
      if (logLevel >= 3)
        this.log(`INFO: ${message}`);
    },
    warn: function (message) {
      if (logLevel >= 2)
        this.log(`WARN: ${message}`);
    },
    error: function (message) {
      if (logLevel >= 1)
        this.log(`ERROR: ${message}`);
    },
    getAll: function () {
      const logData = fs.readFileSync(logFilePath, 'utf-8');
      return logData.split('\n').filter(line => line.trim() !== '');
    }
  }
})();

module.exports = LogService;