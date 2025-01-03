const axios = require('axios');
require('dotenv').config();

const queryData = require('./testQueries.json');

async function run() {
  try {
    console.log('queryData:', queryData);
    for (const query of queryData) {
      console.log('query:', query);
      const response = await axios.post(`http://localhost:${process.env.KB_PORT}/saveQueryVector`, query);
      console.log('response:', response.data);
    }
  }
  catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);
