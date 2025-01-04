const axios = require('axios');
require('dotenv').config();

async function run() {
  const url = `http://localhost:${process.env.KB_PORT}/searchQueryVector`;
  try {
    const q = process.argv[2] || "What is the price of the shoes?";
    const response = await axios.post(url, { q });
    console.log(`response for ${q}:`, response.data);
  }
  catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);
