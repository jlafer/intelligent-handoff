exports.handler = function (context, event, callback) {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;

  // Extract relevant parameters from the event
  const accountSid = event.AccountSid;
  const callSid = event.CallSid;
  const from = event.From;
  const to = event.To;
  const sessionId = event.SessionId;
  const sessionStatus = event.SessionStatus;
  const sessionDuration = event.SessionDuration;
  const handoffData = event.HandoffData;

  console.log('event', event)

  // Parse the handoff data (with error handling for JSON parsing)
  let parsedHandoffData = {};
  try {
    parsedHandoffData = JSON.parse(handoffData);
  } catch (error) {
    console.error("Failed to parse handoffData:", error);
    return callback(error);
  }

  // Define task attributes for TaskRouter, including all parsed handoff data
  const taskAttributes = {
    accountSid: accountSid,
    callSid: callSid,
    from: from,
    to: to,
    sessionId: sessionId,
    sessionStatus: sessionStatus,
    sessionDuration: sessionDuration,
    handoffReason: parsedHandoffData.reason || "No reason provided",
    reasonCode: parsedHandoffData.reasonCode || "No reason code",
    conversationSummary: parsedHandoffData.conversationSummary || "No conversation summary",
    customerData: parsedHandoffData.customerData || "No customer Data",
    escalation_type: parsedHandoffData.conversationSummary || "No conversation summary",
    // You can add more fields if needed from parsedHandoffData
  };

  console.log("Enqueuing call with the following attributes:", taskAttributes);

  // Create TwiML response
  const twiml = new VoiceResponse();

  // Enqueue the Task using the specified workflow and attributes
  twiml.enqueue({
    workflowSid: `${context.TASKROUTER_WORKFLOW_SID}`,
  }).task({ priority: '1000' }, JSON.stringify(taskAttributes));

  // Log the generated TwiML response
  console.log("Generated TwiML:", twiml.toString());

  // Return the TwiML response
  return callback(null, twiml);
};