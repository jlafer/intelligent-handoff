require('dotenv').config();
require('colors');

const { GptService } = require('../services/gpt-service');
const log = require('../services/log-service');
const { getProfileTraits, upsertUser } = require('../services/segment-service');

log.open('INFO', 'test/testCompletions.log');

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
    //log.info(`language : ${cfg.language}, voice : ${cfg.voice}`);

    // handler for incoming text data from GPT
    gptService.on('gptreply', (gptReply, final, icount) => {
      const status = final ? 'final' : 'partial';
      log.debug(`Interaction ${icount}: GPT -> TTS (${status}) : ${gptReply}`.green);
      log.debug(`gptreply: interaction number ${icount}: ${gptReply}`);
    });

    return gptService;
  } catch (err) {
    log.error(err);
  }
}

async function doCompletion(gptService, line, interactionCount) {
  await gptService.completion(line, interactionCount);
}

async function main() {
  const gptService = await init();
  const userInputFile = `./test/${process.argv[2]}/userInput.txt`;
  const userInput = require('fs').readFileSync(userInputFile, 'utf-8').split('\n');
  let interactionCount = 0;
  for (const line of userInput) {
    await doCompletion(gptService, line, interactionCount);
    interactionCount += 1;
  }
}

main();
