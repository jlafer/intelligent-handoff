require('dotenv').config();
const express = require('express');
//const urlencoded = require('body-parser').urlencoded;
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');

const log = require('./services/log-service');

const app = express();
app.use(express.json());
//app.use(urlencoded({ extended: false }));

log.open('INFO', 'kb.log');
log.info('KB started');

const PORT = process.env.KB_PORT || 3003;

let collection;
let openai;

async function getEmbedding(openai, text) {
  const results = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return results.data[0].embedding;
}

async function init() {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const client = new MongoClient(process.env.MONGODB_URI || "");
  const dbName = process.env.MONGODB_DB
  const collectionName = process.env.QUERY_VECTOR_COLLECTION;
  collection = client.db(dbName).collection(collectionName);
}

app.post('/saveQueryVector', async (req, res) => {
  try {
    //log.info('req.body = ', req.body);
    const { q: question, a: answer } = req.body;
    log.info(`vectorizing question -${question}- and answer -${answer}-`);
    // vectorize question
    const question_embedding = await getEmbedding(openai, question);
    // save vectorized question and answer to db
    await collection.insertOne({ question, question_embedding, answer });
    res.status(200).send('OK');
  } catch (err) {
    log.error(err);
  }
});

app.post('/searchQueryVector', async (req, res) => {
  try {
    const { q: question } = req.body;
    log.info(`vectorizing question -${question}-`);

    // vectorize the question
    const question_embedding = await getEmbedding(openai, question);

    // build search pipeline using the embedding (i.e., the vector)
    const agg = [
      {
        '$vectorSearch': {
          'index': 'vector_index',
          'path': 'question_embedding',
          'queryVector': question_embedding,
          'numCandidates': 150,
          'limit': 3
        }
      }, {
        '$project': {
          '_id': 0,
          'question': 1,
          'answer': 1,
          'score': {
            '$meta': 'vectorSearchScore'
          }
        }
      }
    ];

    // run the pipeline
    const result = collection.aggregate(agg);

    let docs = [];
    await result.forEach((doc) => {
      if (doc.score > 0.8) {
        docs.push({ q: doc.question, a: doc.answer, score: doc.score });
      }
    });

    const matches = (docs.length > 0) ? docs : [{ q: question, a: 'That question is going to require the assistance of a live service rep.', score: 0 }];
    res.status(200).send(JSON.stringify(matches));
  } catch (err) {
    log.error(err);
  }
});

async function main() {
  await init();
  app.listen(PORT);
  log.info(`KB running on port ${PORT}`);
}

main();