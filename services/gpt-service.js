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
  console.log(`loaded function: ${functionName}`);
});


class GptService extends EventEmitter {
  constructor(model = 'gpt-4o') {
    super();
    this.openai = new OpenAI();
    this.model = model;
    console.log(`GptService initialized with model: ${model}`);
    this.userContext = [];
    this.partialResponseIndex = 0;
    this.isInterrupted = false;
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
    console.log('setCallInfo', info, callSid);
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
      console.log('Warning: double function arguments returned by OpenAI:', args);
      if (args.indexOf('{') != args.lastIndexOf('{')) {
        return JSON.parse(args.substring(args.indexOf(''), args.indexOf('}') + 1));
      }
    }
  }

  updateUserContext(name, role, text) {
    // console.log('updateUserContext: ', name, role, text)
    const context = { 'role': role, 'content': text };
    if (name !== 'user')
      context.name = name;
    this.userContext.push(context);
  }

  async completion(text, interactionCount, role = 'user', name = 'user') {
    console.log('GptService completion: ', role, name, text);
    this.isInterrupted = false;
    this.updateUserContext(name, role, text);

    // send user transcription to Chat GPT
    let stream = await this.openai.chat.completions.create({
      model: this.model,  
      messages: this.userContext,
      tools: tools,
      stream: true,
      temperature: 0.5,
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
        // collect the tokens containing function data
        collectToolInformation(deltas);
      }

      // call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === 'tool_calls') {
        // parse JSON string of args into JSON object

        const functionToCall = availableFunctions[functionName];
        const validatedArgs = this.validateFunctionArgs(functionArgs);
        // console.log('validatedArgs', validatedArgs);

        // say a pre-configured message from the function manifest
        // before running the function.
        const toolData = tools.find(tool => tool.function.name === functionName);
        const say = toolData.function.say;

        this.emit('gptreply', say, false, interactionCount);

        let functionResponse = await functionToCall(validatedArgs);
        // console.log('functionResponse', functionResponse);

        this.emit('tools', functionName, functionArgs, functionResponse);

        // send the info on the function call and function response to GPT
        this.updateUserContext(functionName, 'function', functionResponse);
        
        // call the completion function again but pass in the function response
        // to have OpenAI generate a new assistant response
        await this.completion(functionResponse, interactionCount, 'function', functionName);
      } 
      else {
        // use completeResponse for userContext
        completeResponse += content;
        // use partialResponse to provide a chunk for TTS
        partialResponse += content;

        // console.log('partialResponse', partialResponse);
        // console.log('completeResponse', completeResponse);
       
        if (finishReason === 'stop') {
          this.emit('gptreply', partialResponse, true, interactionCount);
          console.log('emit gptreply stop');
        }
        else {
          this.emit('gptreply', partialResponse, false, interactionCount);
          // console.log('emit gptreply partialResponse', partialResponse);
          partialResponse = '';
        }
      }
    }
    this.userContext.push({'role': 'assistant', 'content': completeResponse});
    console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GptService };
