require('dotenv').config();
require('colors');
require('log-timestamp');
const express = require('express');
const ExpressWs = require('express-ws');

const { GptService } = require('./services/gpt-service');
const { TextService } = require('./services/text-service');
const { recordingService } = require('./services/recording-service');
const { getLatestConvRelayCfgRcd } = require('./services/airtable-service');

const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 3000;

let gptService; 
let textService;
let record;

app.get('/monitor', (_req, res) => {
  res.sendFile(__dirname + '/monitor.html');
});

const logs = [];

function addLog(level, message) {
    console.log(message);
    const timestamp = new Date().toISOString();
    logs.push({ timestamp, level, message });
}

app.get('/logs', (req, res) => {
    res.json(logs);
});

app.post('/incoming', async (req, res) => {
  try {
    logs.length = 0;
    addLog('info', 'incoming call started');
    
    record = await getLatestConvRelayCfgRcd();

    gptService = new GptService(record.model);
    
    gptService.userContext.push({ 'role': 'system', 'content': record.sys_prompt });
    gptService.userContext.push({ 'role': 'system', 'content': record.profile });
    gptService.userContext.push({ 'role': 'system', 'content': record.orders });
    gptService.userContext.push({ 'role': 'system', 'content': record.inventory });
    gptService.userContext.push({ 'role': 'system', 'content': record.example });
    gptService.userContext.push({ 'role': 'system', 'content': `You can speak in many languages, but use default language ${record.language} for this conversation from now on! Remember it as the default language, even if you change language in between. Treat en-US and en-GB etc. as different languages.` });

    addLog('info', `language : ${record.language}, voice : ${record.voice}`);
    
    const response = 
    `<Response>
      <Connect>
        <ConversationRelay url="wss://${process.env.SERVER}/sockets" dtmfDetection="true" voice="${record.voice}" language="${record.language}" transcriptionProvider="${record.transcriptionProvider}">
          <Language code="fr-FR" ttsProvider="google" voice="fr-FR-Neural2-B" />
          <Language code="es-ES" ttsProvider="google" voice="es-ES-Neural2-B" />
        </ConversationRelay>
      </Connect>
    </Response>`;
    res.type('text/xml');
    res.end(response.toString());
  } catch (err) {
    console.error(err);
  }
});

app.ws('/sockets', (ws) => {
  try {
    ws.on('error', console.error);

    // filled in from start message
    let callSid;

    textService = new TextService(ws);

    let interactionCount = 0;
    
    // handler for incoming data from MediaStreams
    ws.on('message', function message(data) {
      const msg = JSON.parse(data);
      console.log(msg);

      if (msg.type === 'setup') {
        callSid = msg.callSid;        
        addLog('convrelay', `convrelay socket setup for call ${callSid}`);
        gptService.setCallInfo('user phone number', msg.from);

        //trigger gpt to start 
        gptService.completion('hello', interactionCount);
        interactionCount += 1;

        if (record.recording) {
          recordingService(textService, callSid).then(() => {
            console.log(`Twilio -> Starting recording for ${callSid}`.underline.red);
          });
        }
      }  
      
      if (msg.type === 'prompt') {
        addLog('convrelay', `convrelay -> GPT (${msg.lang}) :  ${msg.voicePrompt} `);
        gptService.completion(msg.voicePrompt, interactionCount);
        interactionCount += 1;
      } 
      
      if (msg.type === 'interrupt') {
        addLog('convrelay', 'convrelay interrupt: utteranceUntilInterrupt: ' + msg.utteranceUntilInterrupt + ' durationUntilInterruptMs: ' + msg.durationUntilInterruptMs);
        gptService.interrupt();
        // console.log('Todo: add interruption handling');
      }

      if (msg.type === 'error') {
        addLog('convrelay', 'convrelay error: ' + msg.description);
        console.log('Todo: add error handling');
      }

      if (msg.type === 'dtmf') {
        addLog('convrelay', 'convrelay dtmf: ' + msg.digit);
        console.log('Todo: add dtmf handling');
      }
    });
      
    // handler for incoming text data from GPT
    gptService.on('gptreply', async (gptReply, final, icount) => {
      console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply}`.green );
      //addLog('info', gptReply);
      addLog('gpt', `GPT -> convrelay: Interaction ${icount}: ${gptReply}`);
      textService.sendText(gptReply, final);
    });

    // handler for incoming tool-call data from GPT
    gptService.on('tools', async (functionName, functionArgs, functionResponse) => {
      addLog('gpt', `function ${functionName} with args ${functionArgs}`);
      addLog('gpt', `function response: ${functionResponse}`);

      if (functionName == 'changeLanguage' && record.changeSTT) {
        addLog('convrelay', `convrelay changeLanguage to: ${functionArgs}`);
        const jsonObj = JSON.parse(functionArgs);
        textService.setLang(jsonObj.language);
        //gptService.userContext.push({ 'role': 'assistant', 'content':`change Language to ${functionArgs}`});
      }
    });
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);
