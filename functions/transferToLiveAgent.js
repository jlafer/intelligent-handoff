const text = 'Please hold while I transfer you to a live agent.';
const final = true;

/*
  This function ends the ConversationRelay session, which results in
  the CR TwiML verb ending and the "action" URL attribute being called.
  The handoffData is sent in the action URL payload.
*/
function endSession(ws, handoffData) {
  console.log('in endSession', handoffData)
  const endSessionMessage = {
    type: "end",
    handoffData: JSON.stringify(handoffData)
  };
  console.log("endSession: ending session with data: ", endSessionMessage);
  ws.send(JSON.stringify(endSessionMessage));
}

async function transferToLiveAgent(textService, gptService, ws) {
  textService.sendText(text, final);
  const summary = await gptService.summarizeConversation();
  endSession(
    ws,
    {
      reasonCode: "live-agent-handoff",
      reason: "IVA needs assistance from a live agent",
      conversationSummary: summary,
      customerData: { name: 'John Doe', phone: '+1234567890' }
    }
  );
}

module.exports = {
  transferToLiveAgent
};