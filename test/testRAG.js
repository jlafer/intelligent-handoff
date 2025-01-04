require('dotenv').config();
require('colors');

const { GptService } = require('../services/gpt-service');
const log = require('../services/log-service');
const { getProfileTraits, upsertUser } = require('../services/segment-service');

log.open('INFO', 'test/testRAG.log');

async function init() {
  try {
    const context = require('fs').readFileSync('./test/testRAG.txt', 'utf-8');
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
    await upsertUser({ userId: '+12088747271', anonymousId: null });
    const profileTraits = await getProfileTraits('+12088747271');
    cfg.profile = `The user's full name is ${profileTraits.name}`;
    const gptService = new GptService(log, cfg.model);
    gptService.initUserContext(cfg);
    log.info(`language : ${cfg.language}, voice : ${cfg.voice}`);

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
  const userInput = require('fs').readFileSync('./test/userInput.txt', 'utf-8').split('\n');
  let interactionCount = 0;
  for (const line of userInput) {
    await doCompletion(gptService, line, interactionCount);
    interactionCount += 1;
  }
}

main();
