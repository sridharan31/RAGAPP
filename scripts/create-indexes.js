// MongoDB Search Index Creation Script
// Run this in MongoDB shell or use in your Node.js application

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createSearchIndexes() {
  const client = new MongoClient(process.env.DB);
  
  try {
    await client.connect();
    const db = client.db('rag_doc');
    const collection = db.collection('documents');
    
    console.log('Creating search indexes...');
    
    // 1. Text Search Index for content search
    try {
      await collection.createIndex(
        { 
          content: "text", 
          name: "text" 
        },
        { 
          name: "text_search_index",
          default_language: "english"
        }
      );
      console.log('✅ Text search index created successfully');
    } catch (error) {
      console.log('Text search index already exists or error:', error.message);
    }
    
    // 2. Compound Index for efficient queries
    try {
      await collection.createIndex(
        { 
          name: 1, 
          timestamp: -1 
        },
        { 
          name: "name_timestamp_index" 
        }
      );
      console.log('✅ Compound index created successfully');
    } catch (error) {
      console.log('Compound index already exists or error:', error.message);
    }
    
    // 3. Index on timestamp for sorting
    try {
      await collection.createIndex(
        { timestamp: -1 },
        { name: "timestamp_index" }
      );
      console.log('✅ Timestamp index created successfully');
    } catch (error) {
      console.log('Timestamp index already exists or error:', error.message);
    }
    
    // 4. Vector Index for similarity search (if using MongoDB Atlas Vector Search)
    // Note: This requires MongoDB Atlas with Vector Search enabled
    try {
      await collection.createIndex(
        { embedding: "2dsphere" },
        { name: "vector_index" }
      );
      console.log('✅ Vector index created successfully');
    } catch (error) {
      console.log('Vector index creation failed (requires Atlas Vector Search):', error.message);
    }
    
    // List all indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await client.close();
  }
}

// Run the function
createSearchIndexes();

module.exports = createSearchIndexes;
