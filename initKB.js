require('dotenv').config();
const { MongoClient } = require('mongodb');

async function dropCollection(db, collectionName) {
  const collections = await db.listCollections().toArray();
  if (collections.some(c => c.name === collectionName)) {
    await db.dropCollection(collectionName);
    console.log(`Dropped collection ${collectionName}`);
  }
}

async function createCollection(db, collectionName) {
  await db.createCollection(collectionName);
  console.log(`Collection "${collectionName}" created successfully.`);
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  const dbName = process.env.MONGODB_DB
  const collectionName = process.env.QUERY_VECTOR_COLLECTION;

  try {
    await client.connect();
    const db = client.db(dbName);
    await dropCollection(db, collectionName);
    await createCollection(db, collectionName);

    const collection = db.collection(collectionName);
    const index = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        "fields": [
          {
            "type": "vector",
            "numDimensions": 1536,
            "path": "question_embedding",
            "similarity": "dotProduct"
          }
        ]
      }
    };
    const result = await collection.createSearchIndex(index);
    console.log(`New search index named ${result} is building.`);

    console.log("Polling to check if the index is ready. This may take up to a minute.")
    let isQueryable = false;
    while (!isQueryable) {
      const cursor = collection.listSearchIndexes();
      for await (const index of cursor) {
        if (index.name === result) {
          if (index.queryable) {
            console.log(`${result} is ready for querying.`);
            isQueryable = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
    }

    console.log('index created on the collection.');
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
