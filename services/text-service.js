const EventEmitter = require('events');

class TextService extends EventEmitter {
  constructor(log, websocket) {
    super();
    this.log = log;
    this.ws = websocket;
  }

  sendText (text, last) {
    // this.log.debug('sending text: '.yellow, text, last);
    this.ws.send(
      JSON.stringify({
        type: 'text',
        token: text,
        last: last,
      })
    );
  }

  setLang(language) {
    this.log.info(`setLang: to ${language}`);
    this.ws.send(
      JSON.stringify({
        type: 'language',
        ttsLanguage: language,
        transcriptionLanguage: language,
      })
    );
  }
}

module.exports = {TextService};