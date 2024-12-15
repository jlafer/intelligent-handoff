require('dotenv').config();
require('colors');
require('log-timestamp');
const express = require('express');
const ExpressWs = require('express-ws');

const { GptService } = require('./services/gpt-service');
const { TextService } = require('./services/text-service');
const { recordingService } = require('./services/recording-service');
//const { upsertUser } = require('./services/segment-service');
const { getLatestConvRelayCfgRcd } = require('./services/airtable-service');
const log = require('./services/log-service');

const app = express();
ExpressWs(app);

log.open('INFO', 'app.log');
log.info('Server started');

const PORT = process.env.PORT || 3000;

let gptService; 
let textService;
let cfg;

app.get('/monitor', (_req, res) => {
  res.sendFile(__dirname + '/monitor.html');
});

app.get('/logs', (_req, res) => {
  res.json(log.getAll());
});

app.post('/incoming', async (_req, res) => {
  try {
    log.info('incoming call started');
    cfg = await getLatestConvRelayCfgRcd();
    gptService = new GptService(cfg.model);
    gptService.initUserContext(cfg);
    log.info(`language : ${cfg.language}, voice : ${cfg.voice}`);
    
    const response = 
    `<Response>
      <Connect>
        <ConversationRelay url="wss://${process.env.SERVER}/sockets" dtmfDetection="true" voice="${cfg.voice}" language="${cfg.language}" transcriptionProvider="${cfg.transcriptionProvider}">
          <Language code="fr-FR" ttsProvider="google" voice="fr-FR-Neural2-B" />
          <Language code="es-ES" ttsProvider="google" voice="es-ES-Neural2-B" />
        </ConversationRelay>
      </Connect>
    </Response>`;
    res.type('text/xml');
    res.end(response.toString());
  } catch (err) {
    log.error(err);
  }
});

app.ws('/sockets', (ws) => {
  try {
    ws.on('error', log.error);

    // filled in from start message
    let callSid;

    textService = new TextService(ws);

    let interactionCount = 0;
    
    // handler for incoming data from MediaStreams
    ws.on('message', function message(data) {
      const msg = JSON.parse(data);
      log.info(msg);

      if (msg.type === 'setup') {
        callSid = msg.callSid;        
        log.info(`convrelay socket setup for call ${callSid}`);
        gptService.setCallInfo('user phone number', msg.from);

        //trigger gpt to start 
        gptService.completion('hello', interactionCount);
        interactionCount += 1;

        if (cfg.recording) {
          recordingService(textService, callSid).then(() => {
            log.info(`Twilio -> Starting recording for ${callSid}`.underline.red);
          });
        }
      }  
      
      if (msg.type === 'prompt') {
        log.info(`convrelay -> GPT (${msg.lang}) : ${msg.voicePrompt} `);
        gptService.completion(msg.voicePrompt, interactionCount);
        interactionCount += 1;
      } 
      
      if (msg.type === 'interrupt') {
        log.info('convrelay interrupt: utteranceUntilInterrupt: ' + msg.utteranceUntilInterrupt + ' durationUntilInterruptMs: ' + msg.durationUntilInterruptMs);
        gptService.interrupt();
        log.warn('Todo: add interruption handling');
      }

      if (msg.type === 'error') {
        log.error('convrelay error: ' + msg.description);
        log.warn('Todo: add error handling');
      }

      if (msg.type === 'dtmf') {
        log.info('convrelay dtmf: ' + msg.digit);
        log.warn('Todo: add dtmf handling');
      }
    });
      
    // handler for incoming text data from GPT
    gptService.on('gptreply', async (gptReply, final, icount) => {
      log.info(`Interaction ${icount}: GPT -> TTS: ${gptReply}`.green);
      log.debug(`GPT -> convrelay: Interaction ${icount}: ${gptReply}`);
      textService.sendText(gptReply, final);
    });

    // handler for incoming tool-call data from GPT
    gptService.on('tools', async (functionName, functionArgs, functionResponse) => {
      log.info(`function ${functionName} with args ${functionArgs}`);
      log.info(`function response: ${functionResponse}`);

      if (functionName == 'changeLanguage' && cfg.changeSTT) {
        log.info(`convrelay changeLanguage to: ${functionArgs}`);
        const jsonObj = JSON.parse(functionArgs);
        textService.setLang(jsonObj.language);
        //gptService.userContext.push({ 'role': 'assistant', 'content':`change Language to ${functionArgs}`});
      }
    });
  } catch (err) {
    log.error(err);
  }
});

app.listen(PORT);
log.info(`Server running on port ${PORT}`);
