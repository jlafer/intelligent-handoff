const { getLatestConvRelayCfgRcd } = require('../services/airtable-service');

async function test() {
    try {
      const record = await getLatestConvRelayCfgRcd();
        console.log('Latest record:', record);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();