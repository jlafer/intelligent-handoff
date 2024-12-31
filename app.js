require('dotenv').config();
require('colors');
require('log-timestamp');
const express = require('express');
const ExpressWs = require('express-ws');
const urlencoded = require('body-parser').urlencoded;

const { GptService } = require('./services/gpt-service');
const { TextService } = require('./services/text-service');
const { recordingService } = require('./services/recording-service');
const { getProfileTraits, upsertUser } = require('./services/segment-service');
const { getLatestConvRelayCfgRcd } = require('./services/airtable-service');
const log = require('./services/log-service');

const app = express();
app.use(urlencoded({ extended: false }));
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

app.post('/incoming', async (req, res) => {
  try {
    const { From: from } = req.body;
    log.info('incoming call; connecting to ConversationRelay');
    log.debug('call data:', req.body);
    cfg = await getLatestConvRelayCfgRcd();
    log.debug('cfg:', cfg);
    await upsertUser({ userId: from, anonymousId: null });
    const profileTraits = await getProfileTraits(from);
    cfg.profile = `The user's full name is ${profileTraits.name}`;
    gptService = new GptService(log, cfg.model);
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

    textService = new TextService(log, ws);

    let interactionCount = 0;
    
    // handler for incoming data from MediaStreams
    ws.on('message', async function message(data) {
      const msg = JSON.parse(data);
      log.debug('message:', msg);
      const {
        type, callSid, description, digit, from, lang, utteranceUntilInterrupt,
        voicePrompt, durationUntilInterruptMs
      } = msg;        

      if (type === 'setup') {
        log.info(`convrelay socket setup for call ${callSid} from ${from}`);
        gptService.setCallInfo('phone call SID', callSid);

        const profileTraits = await getProfileTraits(from);
        log.info('profileTraits:', profileTraits);
        //trigger gpt to start 
        gptService.completion('hello', interactionCount);
        interactionCount += 1;

        if (cfg.recording) {
          recordingService(textService, callSid).then((recordingSid) => {
            log.info(`Twilio -> Starting recording ${recordingSid} for call ${callSid}`.underline.red);
          });
        }
      }  
      
      if (type === 'prompt') {
        log.info(`convrelay prompt: (${lang}) : ${voicePrompt}`);
        gptService.completion(voicePrompt, interactionCount);
        interactionCount += 1;
      } 
      
      if (type === 'interrupt') {
        log.info(`convrelay interrupt: utteranceUntilInterrupt: ${utteranceUntilInterrupt} durationUntilInterruptMs: ${durationUntilInterruptMs}`);
        gptService.interrupt();
        log.warn('Todo: add interruption handling');
      }

      if (type === 'error') {
        log.error(`convrelay error: ${description}`);
        log.warn('Todo: add error handling');
      }

      if (type === 'dtmf') {
        log.info(`convrelay dtmf: ${digit}`);
        log.warn('Todo: add dtmf handling');
      }
    });
      
    // handler for incoming text data from GPT
    gptService.on('gptreply', (gptReply, final, icount) => {
      log.info(`Interaction ${icount}: GPT -> TTS: ${gptReply}`.green);
      log.debug(`gptreply: interaction number ${icount}: ${gptReply}`);
      textService.sendText(gptReply, final);
    });

    // handler for incoming tool-call data from GPT
    gptService.on('tools', (functionName, functionArgs, functionResponse) => {
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
