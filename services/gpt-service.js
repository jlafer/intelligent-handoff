require('colors');
const EventEmitter = require('events');
const OpenAI = require('openai');

// Import all functions included in function manifest
const tools = require('../functions/function-manifest');

const availableFunctions = {};

tools.forEach((tool) => {
  let functionName = tool.function.name;
  // Note: the function name and file name must be the same
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});


class GptService extends EventEmitter {
  constructor(log, model = 'gpt-4o') {
    super();
    this.log = log;
    this.openai = new OpenAI();
    this.model = model;
    this.log.info(`GptService initialized with model: ${model}`);
    this.userContext = [];
    this.partialResponseIndex = 0;
    this.isInterrupted = false;

    Object.keys(availableFunctions).forEach((fnName) => {
      this.log.info(`Available function: ${fnName}`);
    });
  }

  initUserContext(cfg) {
    this.userContext.push({ 'role': 'assistant', 'content': 'Hello! Welcome to Owl Shoes, how can i help you today' });
    this.userContext.push({ 'role': 'system', 'content': cfg.sys_prompt });
    this.userContext.push({ 'role': 'system', 'content': cfg.profile });
    this.userContext.push({ 'role': 'system', 'content': cfg.orders });
    this.userContext.push({ 'role': 'system', 'content': cfg.inventory });
    this.userContext.push({ 'role': 'system', 'content': cfg.example });
    this.userContext.push({ 'role': 'system', 'content': `You can speak in many languages, but use default language ${cfg.language} for this conversation from now on! Remember it as the default language, even if you change language in between. Treat en-US and en-GB etc. as different languages.` });
  }

  // add the callSid to the chat context in case ChatGPT decides to transfer the call
  setCallInfo(info, callSid) {
    this.log.info('setCallInfo', info, callSid);
    this.userContext.push({ 'role': 'user', 'content': `${info}: ${callSid}` });
  }

  interrupt() {
    this.isInterrupted = true;
  }

  validateFunctionArgs(args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      // we've been seeing an error where sometimes we have two sets of args
      this.log.info('Warning: double function arguments returned by OpenAI:', args);
      if (args.indexOf('{') != args.lastIndexOf('{')) {
        return JSON.parse(args.substring(args.indexOf(''), args.indexOf('}') + 1));
      }
    }
  }

  updateUserContext(name, role, text) {
    // this.log.info('updateUserContext: ', name, role, text)
    const context = { 'role': role, 'content': text };
    if (name !== 'user')
      context.name = name;
    this.userContext.push(context);
  }

  async completion(text, interactionCount, role = 'user', name = 'user') {
    this.log.info(`GptService completion: ${role} ${name} ${text}`.green);
    this.isInterrupted = false;
    this.updateUserContext(name, role, text);

    // send user transcription to Chat GPT
    let stream = await this.openai.chat.completions.create({
      model: this.model,  
      messages: this.userContext,
      tools: tools,
      stream: true,
      temperature: 0.0,
    });

    let completeResponse = '';
    let partialResponse = '';
    let functionName = '';
    let functionArgs = '';
    let finishReason = '';

    function collectToolInformation(deltas) {
      let name = deltas.tool_calls[0]?.function?.name || '';
      if (name != '') {
        functionName = name;
      }
      let args = deltas.tool_calls[0]?.function?.arguments || '';
      if (args != '') {
        // args are streamed as JSON string so we need to concatenate all chunks
        functionArgs += args;
      }
      //this.log.info('collectToolInformation', functionName, functionArgs);
      console.log('collectToolInformation', functionName, functionArgs);
    }

    for await (const chunk of stream) {
      if (this.isInterrupted) {
        break;
      }

      let content = chunk.choices[0]?.delta?.content || '';
      let deltas = chunk.choices[0].delta;
      finishReason = chunk.choices[0].finish_reason;

      // if GPT wants to call a function
      if (deltas.tool_calls) {
        // collect the (partial) tokens containing function data
        collectToolInformation(deltas);
      }

      // call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === 'tool_calls') {
        // parse JSON string of args into JSON object
        const functionToCall = availableFunctions[functionName];
        const validatedArgs = this.validateFunctionArgs(functionArgs);
        // this.log.info('validatedArgs', validatedArgs);

        // say a pre-configured message from the function manifest
        // before running the function.
        const toolData = tools.find(tool => tool.function.name === functionName);
        const say = toolData.function.say;
        if (say)
          this.emit('gptreply', say, false, interactionCount);

        let functionResponse = await functionToCall(validatedArgs);
        // this.log.info('functionResponse', functionResponse);

        this.emit('tools', functionName, functionArgs, functionResponse);

        // use the info on the function call and response to update the GPT context
        //this.updateUserContext(functionName, 'function', functionResponse);
        
        // call the completion function again but pass in the function response
        // to have OpenAI generate a new assistant response
        await this.completion(functionResponse, interactionCount, 'function', functionName);
      } 
      else {
        // use completeResponse for userContext
        completeResponse += content;
        // use partialResponse to provide a chunk for TTS
        partialResponse += content;

        // this.log.info('partialResponse', partialResponse);
        // this.log.info('completeResponse', completeResponse);
       
        if (finishReason === 'stop') {
          this.emit('gptreply', partialResponse, true, interactionCount);
          this.log.info('emit gptreply stop');
        }
        else {
          this.emit('gptreply', partialResponse, false, interactionCount);
          // this.log.info('emit gptreply partialResponse', partialResponse);
          partialResponse = '';
        }
      }
    }
    this.userContext.push({'role': 'assistant', 'content': completeResponse});
    this.log.info(`GPT -> completion response: ${completeResponse}`.blue);
    this.log.info(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GptService };
