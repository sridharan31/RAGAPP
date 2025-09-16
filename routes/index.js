var express = require('express');
var router = express.Router();
const mongodb= require("mongodb");
const createEmbedding = require("./embedings");
const QdrantService = require("../services/qdrant");

const path = require('path');
const PDFParser = require("pdf2json");
const fs = require("fs");
const pdfParser = new PDFParser(this, 1);
/* GET home page. */
router.get('/', async function(req, res, next) {
  try{
    // Connect to local MongoDB running in Docker
    const connection = await mongodb.MongoClient.connect(process.env.DB, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      connectTimeoutMS: 10000,
    });
    const db = connection.db("rag_doc");
    const collection = db.collection("documents");
    
    // Insert a test document
    await collection.insertOne({
      name: "test_document", 
      content: "Test document from RAG app",
      timestamp: new Date()
    });
    
    // Get document count
    const count = await collection.countDocuments();
    console.log(`Successfully connected to MongoDB. Documents in collection: ${count}`);
    
    await connection.close();
    res.render('index', { title: 'RAG Application' });
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
    // Still render the page even if DB connection fails
    res.render('index', { title: 'RAG Application (DB Offline)' });
  }
});

const parsePDF = (filePath) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    
    pdfParser.on("pdfParser_dataReady", (data) => {
      resolve(pdfParser.getRawTextContent());
    });
    
    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(errData.parserError);
    });
    
    pdfParser.loadPDF(filePath);
  });
};
router.post('/Load-document', async function(req, res, next) {
  try {
    const pdfPath = path.join(__dirname, '../doc/Motor-Vehicle-Insurance.pdf');
    const pdfText = await parsePDF(pdfPath);
    
    // Write extracted text to file
    await fs.writeFileSync("./context.txt", pdfText);
    console.log("Extracted text from PDF:", pdfText.substring(0, 200));
    
    // Split text into chunks
    const context = await fs.readFileSync("./context.txt", "utf-8");
    const splitContext = context.split("\n").filter(line => line.trim().length > 0);
    
    // Initialize Qdrant service
    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    const useQdrant = qdrantHealth.status === 'healthy';
    
    if (useQdrant) {
      console.log("✅ Qdrant is available, using hybrid storage (MongoDB + Qdrant)");
      await qdrant.initializeCollection(768); // Initialize collection if needed
    } else {
      console.log("⚠️ Qdrant not available, using MongoDB only");
    }
    
    // Connect to MongoDB for metadata storage
    const connection = await mongodb.MongoClient.connect(process.env.DB);
    const db = connection.db("rag_doc");
    const mongoCollection = db.collection("documents");
    
    let processedCount = 0;
    const batchSize = 5; // Process in smaller batches
    
    for (let i = 0; i < splitContext.length; i += batchSize) {
      const batch = splitContext.slice(i, i + batchSize);
      
      for (const line of batch) {
        if (line.trim()) {
          try {
            // Create embedding
            const embedding = await createEmbedding(line);
            
            // Create document metadata
            const documentMetadata = {
              name: "Motor-Vehicle-Insurance.pdf",
              content: line,
              timestamp: new Date(),
              chunk_index: processedCount
            };
            
            if (useQdrant) {
              // Store vector in Qdrant and metadata in MongoDB
              const documentId = `doc_${Date.now()}_${processedCount}`;
              
              // Add to Qdrant
              await qdrant.addDocument(documentId, embedding, documentMetadata);
              
              // Store minimal metadata in MongoDB (without embedding to save space)
              await mongoCollection.insertOne({
                ...documentMetadata,
                qdrant_id: documentId,
                has_vector: true
              });
            } else {
              // Fallback: store everything in MongoDB
              await mongoCollection.insertOne({
                ...documentMetadata,
                embedding: embedding,
                has_vector: false
              });
            }
            
            processedCount++;
            
            if (processedCount % 10 === 0) {
              console.log(`Processed ${processedCount} chunks...`);
            }
          } catch (error) {
            console.error(`Error processing chunk ${processedCount}:`, error.message);
          }
        }
      }
    }
    
    await connection.close();
    
    const message = useQdrant 
      ? `PDF parsed and saved successfully. ${processedCount} chunks stored in Qdrant + MongoDB.`
      : `PDF parsed and saved successfully. ${processedCount} chunks stored in MongoDB only.`;
    
    res.status(200).json({
      success: true,
      message: message,
      chunks_processed: processedCount,
      storage_type: useQdrant ? "hybrid" : "mongodb_only"
    });
    
  } catch (error) {
    console.error("Error loading or parsing PDF:", error);
    res.status(500).json({
      error: "Failed to load or parse PDF",
      message: error.message
    });
  }
});

pdfParser.on("pdfParser_dataReady", async (data) => {
  await fs.writeFileSync("./context.txt", pdfParser.getRawTextContent());
  console.log("PDF parsed successfully:", data);
});
    // const pdfFilePath = req.body.pdfFilePath; // Get PDF file path from request body
    // if (!pdfFilePath) {
    //   return res.status(400).send("PDF file path is required");
    // }

    // pdfParser.on("pdfParser_dataError", errData => {
    //   console.error("Error parsing PDF:", errData.parserError);
    //   res.status(500).send("Error parsing PDF");
    // });

    // pdfParser.on("pdfParser_dataReady", async pdfData => {
    //   try {
    //     const text = pdfParser.getRawTextContent();
    //     console.log("Extracted text from PDF:", text.substring(0, 200)); // Log first 200 chars

    //     // Create embedding for the extracted text
    //     const embedding = await createEmbedding(text);

    //     // Connect to MongoDB and store the document with embedding
    //     const connection = await mongodb.MongoClient.connect(process.env.DB, {
    //       serverSelectionTimeoutMS: 5000, 
          
    //     }}}}
router.get('/embeddings', async function(req, res, next) {
  try {
    const text = req.query.text;
    const embedding = await createEmbedding(text);
    res.json({ embedding });
  } catch (error) {
    console.error("Error creating embedding:", error);
    res.status (500).send("Internal Server Error");
  }
});

// New route for Google GenAI embeddings with multiple texts (like your example)
router.get('/google-embeddings', async function(req, res, next) {
  try {
    // Use the example texts you provided, or allow custom texts via query params
    const defaultTexts = [
      'What is the meaning of life?',
      'What is the purpose of existence?',
      'How do I bake a cake?'
    ];
    
    let contents = defaultTexts;
    
    // Allow custom texts via query parameters
    if (req.query.texts) {
      try {
        contents = JSON.parse(req.query.texts);
      } catch (e) {
        // If JSON parsing fails, treat as single text
        contents = [req.query.texts];
      }
    } else if (req.query.text) {
      contents = [req.query.text];
    }
    
    const embeddingsModule = require("./embedings");
    const createGoogleEmbedding = embeddingsModule.createGoogleEmbedding;
    const embeddings = await createGoogleEmbedding(contents);
    
    res.json({ 
      inputs: contents,
      embeddings: embeddings,
      count: Array.isArray(embeddings) ? embeddings.length : 1
    });
  } catch (error) {
    console.error("Error creating Google embeddings:", error);
    res.status(500).json({ 
      error: "Failed to create Google embeddings", 
      message: error.message 
    });
  }
});

// Search route for full-text search
router.get('/search', async function(req, res, next) {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    
    const connection = await mongodb.MongoClient.connect(process.env.DB, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    const db = connection.db("rag_doc");
    const collection = db.collection("documents");
    
    // Text search using MongoDB's text index
    const searchResults = await collection.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(10)
    .toArray();
    
    await connection.close();
    
    res.json({
      query: query,
      results: searchResults,
      count: searchResults.length
    });
    
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ 
      error: "Search failed", 
      message: error.message 
    });
  }
});

// Vector similarity search route
router.get('/similarity-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    const connection = await mongodb.MongoClient.connect(process.env.DB, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    
    const db = connection.db("rag_doc");
    const collection = db.collection("documents");
    
    // Get all documents with embeddings for similarity calculation
    const documents = await collection.find({ embedding: { $exists: true } }).toArray();
    
    // Calculate cosine similarity
    const results = documents.map(doc => {
      const similarity = calculateCosineSimilarity(queryEmbedding, doc.embedding);
      return {
        ...doc,
        similarity: similarity
      };
    });
    
    // Sort by similarity score (highest first)
    results.sort((a, b) => b.similarity - a.similarity);
    
    // Return top 10 results
    const topResults = results.slice(0, 10);
    
    await connection.close();
    
    res.json({
      query: query,
      results: topResults,
      count: topResults.length
    });
    
  } catch (error) {
    console.error("Error performing similarity search:", error);
    res.status(500).json({ 
      error: "Similarity search failed", 
      message: error.message 
    });
  }
});

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Qdrant vector search route
router.get('/qdrant-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    
    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Qdrant service unavailable", 
        message: "Vector search is not available" 
      });
    }
    
    // Create embedding for the query
    const queryVector = await createEmbedding(query);
    
    // Perform vector search
    const results = await qdrant.search(queryVector, limit);
    
    res.json({
      query: query,
      results: results,
      count: results.length,
      search_type: "qdrant_vector"
    });
    
  } catch (error) {
    console.error("Error performing Qdrant search:", error);
    res.status(500).json({ 
      error: "Qdrant search failed", 
      message: error.message 
    });
  }
});

// Qdrant search with filters
router.get('/qdrant-filtered-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const documentName = req.query.document_name;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    
    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Qdrant service unavailable", 
        message: "Vector search is not available" 
      });
    }
    
    // Create embedding for the query
    const queryVector = await createEmbedding(query);
    
    // Build filters
    const filters = {};
    if (documentName) filters.document_name = documentName;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    
    // Perform filtered vector search
    const results = await qdrant.searchWithFilter(queryVector, filters, limit);
    
    res.json({
      query: query,
      filters: filters,
      results: results,
      count: results.length,
      search_type: "qdrant_filtered_vector"
    });
    
  } catch (error) {
    console.error("Error performing filtered Qdrant search:", error);
    res.status(500).json({ 
      error: "Filtered Qdrant search failed", 
      message: error.message 
    });
  }
});

// Qdrant health check endpoint
router.get('/qdrant-health', async function(req, res, next) {
  try {
    const qdrant = new QdrantService();
    const health = await qdrant.healthCheck();
    
    if (health.status === 'healthy') {
      const collectionInfo = await qdrant.getCollectionInfo();
      res.json({
        status: health.status,
        collection_info: collectionInfo.result
      });
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

module.exports = router;
