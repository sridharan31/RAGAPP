// MongoDB Atlas Vector Search Index Creation
// This script creates vector search indexes for MongoDB Atlas

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createVectorSearchIndex() {
  const client = new MongoClient(process.env.DB);
  
  try {
    await client.connect();
    const db = client.db('rag_doc');
    const collection = db.collection('documents');
    
    console.log('Creating vector search index on MongoDB Atlas...');
    
    // Vector Search Index Definition
    const vectorIndexDefinition = {
      name: "vector_search_index",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 768, // Adjust based on your embedding model
            similarity: "cosine" // Options: "euclidean", "cosine", "dotProduct"
          },
          {
            type: "filter",
            path: "name"
          },
          {
            type: "filter", 
            path: "timestamp"
          }
        ]
      }
    };
    
    // Note: Vector search indexes must be created through MongoDB Atlas UI or Atlas API
    // This is a demonstration of the index structure
    console.log('Vector Search Index Definition:');
    console.log(JSON.stringify(vectorIndexDefinition, null, 2));
    
    console.log('\n📋 To create this index:');
    console.log('1. Go to MongoDB Atlas Dashboard');
    console.log('2. Navigate to your cluster > Browse Collections');
    console.log('3. Select "rag_doc" database > "documents" collection');
    console.log('4. Click on "Search Indexes" tab');
    console.log('5. Click "Create Search Index"');
    console.log('6. Choose "Vector Search" and use the definition above');
    
    // Alternative: Use Atlas Admin API to create the index programmatically
    console.log('\n🔧 Or use Atlas Admin API:');
    console.log('POST https://cloud.mongodb.com/api/atlas/v1.0/groups/{PROJECT-ID}/clusters/{CLUSTER-NAME}/fts/indexes');
    
    // Test connection to Atlas
    const pingResult = await db.admin().ping();
    console.log('\n✅ Successfully connected to MongoDB Atlas:', pingResult);
    
    // Check existing indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
      console.log('\n❌ Connection failed. Please check:');
      console.log('1. Your IP is whitelisted in MongoDB Atlas Network Access');
      console.log('2. Your connection string is correct');
      console.log('3. Your network allows connections to MongoDB Atlas');
    }
  } finally {
    await client.close();
  }
}

// Run the function
createVectorSearchIndex();

module.exports = createVectorSearchIndex;
