const axios = require('axios');
require('dotenv').config();

let q, response;

async function run() {
  const url = `http://localhost:${process.env.KB_PORT}/searchQueryVector`;
  try {
    q = "How long does it take for a pair of shoes to ship?";
    response = await axios.post(url, { q });
    console.log(`response for ${q}:`, response.data);
    q = "Do you have the loafers in black?";
    response = await axios.post(url, { q });
    console.log(`response for ${q}:`, response.data);
  }
  catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);
