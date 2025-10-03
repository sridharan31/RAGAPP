// Migration script from MongoDB to Qdrant
const { MongoClient } = require('mongodb');
const QdrantService = require('../services/qdrant');
const { createEmbeddingWithProvider } = require('../routes/embedings');
const { randomUUID } = require('crypto');
require('dotenv').config();

// Import AI provider functions with fallback handling
let getActiveProvider, getProviderConfig;
try {
  const aiProviders = require('../routes/ai-providers');
  getActiveProvider = aiProviders.getActiveProvider;
  getProviderConfig = aiProviders.getProviderConfig;
} catch (error) {
  console.warn('AI providers module not found, using default embedding provider');
  getActiveProvider = () => 'google';
  getProviderConfig = () => null;
}

async function migrateToQdrant() {
  const qdrant = new QdrantService();
  let mongoClient;

  try {
    console.log('🚀 Starting migration from MongoDB to Qdrant...\n');

    // Initialize Qdrant collection
    await qdrant.initializeCollection(768); // Adjust vector size based on your model

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    mongoClient = new MongoClient(process.env.DB);
    await mongoClient.connect();
    
    const db = mongoClient.db('rag_doc');
    const collection = db.collection('documents');

    // Get all documents from MongoDB
    console.log('📋 Fetching documents from MongoDB...');
    const documents = await collection.find({}).toArray();
    console.log(`Found ${documents.length} documents to migrate\n`);

    if (documents.length === 0) {
      console.log('No documents found to migrate');
      return;
    }

    // Process documents in batches
    const batchSize = 10;
    let processed = 0;
    let successful = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}...`);

      const qdrantDocuments = [];

      for (const doc of batch) {
        try {
          let vector = doc.embedding;
          
          // If no embedding exists, create one using selected AI provider
          if (!vector && doc.content) {
            console.log(`  Creating embedding for document: ${doc._id}`);
            const activeProvider = getActiveProvider();
            const providerConfig = getProviderConfig(activeProvider);
            vector = await createEmbeddingWithProvider(doc.content, activeProvider, providerConfig);
          }

          if (vector) {
            qdrantDocuments.push({
              id: randomUUID(), // Generate a proper UUID instead of using MongoDB ObjectId
              vector: vector,
              metadata: {
                content: doc.content || '',
                name: doc.name || 'Unknown',
                timestamp: doc.timestamp ? doc.timestamp.toISOString() : new Date().toISOString(),
                original_mongo_id: doc._id.toString()
              }
            });
          } else {
            console.log(`  ⚠️ Skipping document ${doc._id} - no content or embedding`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing document ${doc._id}:`, error.message);
        }
      }

      // Add batch to Qdrant
      if (qdrantDocuments.length > 0) {
        try {
          await qdrant.addDocuments(qdrantDocuments);
          successful += qdrantDocuments.length;
        } catch (error) {
          console.error(`  ❌ Error adding batch to Qdrant:`, error.message);
        }
      }

      processed += batch.length;
      console.log(`  Progress: ${processed}/${documents.length} processed, ${successful} successful\n`);
    }

    // Verify migration
    console.log('🔍 Verifying migration...');
    try {
      const qdrantInfo = await qdrant.getCollectionInfo();
      console.log(`Qdrant collection info:`, {
        vectors_config: qdrantInfo.result.config?.params?.vectors || 'Unknown',
        points_count: qdrantInfo.result.points_count,
        segments_count: qdrantInfo.result.segments_count
      });
    } catch (error) {
      console.log('Collection info:', error.message);
    }

    console.log('\n✅ Migration completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Total documents: ${documents.length}`);
    console.log(`  - Successfully migrated: ${successful}`);
    console.log(`  - Failed: ${processed - successful}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('📦 MongoDB connection closed');
    }
  }
}

// Test Qdrant search after migration
async function testQdrantSearch() {
  const qdrant = new QdrantService();
  
  try {
    console.log('\n🧪 Testing Qdrant search...');
    
    // Create a test query
    const queryText = "insurance policy";
    console.log(`Searching for: "${queryText}"`);
    
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryVector = await createEmbeddingWithProvider(queryText, activeProvider, providerConfig);
    const results = await qdrant.search(queryVector, 5);
    
    console.log(`Found ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.score.toFixed(4)} - ${result.content.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Test search failed:', error);
  }
}

// Health check
async function healthCheck() {
  const qdrant = new QdrantService();
  
  try {
    console.log('🏥 Checking Qdrant health...');
    const health = await qdrant.healthCheck();
    console.log('Qdrant status:', health.status);
    return health.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

// Main execution
async function main() {
  const isHealthy = await healthCheck();
  
  if (!isHealthy) {
    console.log('❌ Qdrant is not accessible. Please ensure:');
    console.log('1. Qdrant is running: docker-compose up -d');
    console.log('2. Qdrant URL is correct in .env file');
    return;
  }

  await migrateToQdrant();
  await testQdrantSearch();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateToQdrant, testQdrantSearch, healthCheck };
