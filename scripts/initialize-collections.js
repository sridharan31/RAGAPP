// Script to initialize all Qdrant collections
const QdrantService = require('../services/qdrant');

async function initializeCollections() {
  try {
    console.log('🚀 Initializing Qdrant collections...');
    
    const qdrantService = new QdrantService();
    
    // Initialize all collections
    await qdrantService.initializeAllCollections();
    
    console.log('✅ All collections initialized successfully!');
    console.log('You can now check the collections at: http://localhost:6333/dashboard');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing collections:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeCollections();