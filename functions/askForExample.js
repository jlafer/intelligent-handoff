const axios = require('axios');

async function askForExample(functionArgs) {
  let inquiry = functionArgs.inquiry;
  const searchResponse = await axios.post(`https://${process.env.KB_SERVER}/searchQueryVector`, { q: inquiry });
  console.log(`response for ${inquiry}:`, searchResponse.data);
  const response = `Example response for "${inquiry}" is "${searchResponse.data[0].a}"`;
  return response;
}

module.exports = askForExample;