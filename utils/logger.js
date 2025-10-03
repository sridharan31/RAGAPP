// utils/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const metadataStr = Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metadataStr}\n`;
  }

  writeToFile(level, message) {
    const filename = `${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(this.logDir, filename);
    
    try {
      fs.appendFileSync(filepath, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, metadata = {}) {
    const formattedMessage = this.formatMessage('info', message, metadata);
    console.log(formattedMessage.trim());
    this.writeToFile('info', formattedMessage);
  }

  error(message, metadata = {}) {
    const formattedMessage = this.formatMessage('error', message, metadata);
    console.error(formattedMessage.trim());
    this.writeToFile('error', formattedMessage);
  }

  warn(message, metadata = {}) {
    const formattedMessage = this.formatMessage('warn', message, metadata);
    console.warn(formattedMessage.trim());
    this.writeToFile('warn', formattedMessage);
  }

  debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('debug', message, metadata);
      console.debug(formattedMessage.trim());
      this.writeToFile('debug', formattedMessage);
    }
  }
}

module.exports = new Logger();