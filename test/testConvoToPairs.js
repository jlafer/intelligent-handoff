require('dotenv').config();
require('colors');

const { GptService } = require('../services/gpt-service');
const log = require('../services/log-service');

log.open('INFO', 'test/testConvoToPairs.log');

let pairText = '';

async function init() {
  try {
    const contextFile = `./test/${process.argv[2]}/context.txt`;
    const context = require('fs').readFileSync(contextFile, 'utf-8');
    const cfg = {
      sys_prompt: context,
      profile: '',
      orders: '',
      inventory: '',
      example: '',
      model: 'gpt-4o-2024-08-06',
      language: 'en-GB',
      changeSTT: false,
      recording: false,
      transcriptionProvider: 'google',
      voice: 'en-GB-Journey-D'
    }
    log.debug('cfg:', cfg);
    const gptService = new GptService(log, cfg.model);
    gptService.updateUserContext('system', 'system', context);

    // handler for incoming text data from GPT
    gptService.on('gptreply', (gptReply, final, icount) => {
      pairText += gptReply;
      if (final) {
        log.info('output text:', pairText);
      }
    });

    return gptService;
  } catch (err) {
    log.error(err);
  }
}

async function main() {
  const gptService = await init();
  const userInputFile = `./test/${process.argv[2]}/userInput.txt`;
  const userInput = require('fs').readFileSync(userInputFile, 'utf-8');
  let interactionCount = 0;
  gptService.updateUserContext('user', 'user', userInput);
  await gptService.completion('', interactionCount);
  interactionCount += 1;
}

main();
