
require('colors');
require('dotenv').config();

async function recordingService(textService, callSid) {
  try {
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // textService.sendText({partialResponseIndex: null, partialResponse: 'This call will be recorded.'}, 0);
    const recording = await client.calls(callSid)
      .recordings
      .create({ recordingChannels: 'dual' });
    return recording.sid;
  } catch (err) {
    console.log('Error while starting recording:', err);
  }
}

module.exports = { recordingService };