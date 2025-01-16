require('dotenv').config();

const { upsertUser } = require('../services/segment-service');

async function run(name, number) {
  try {
    await upsertUser({ userId: number, traits: { name } });
  }
  catch (err) {
    console.error(err);
  }
}

const name = process.argv[2];
const number = process.argv[3];
run(name, number).catch(console.dir);
