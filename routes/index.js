var express = require('express');
var router = express.Router();
const createEmbedding = require("./embedings");
const QdrantService = require("../services/qdrant");
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const axios = require('axios');

const path = require('path');
const PDFParser = require("pdf2json");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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
router.post('/Load-document', upload.single('pdfFile'), async function(req, res, next) {
  try {
    let pdfPath;
    let pdfFileName;
    
    // Check if file was uploaded or use default path
    if (req.file) {
      // Use uploaded file
      pdfPath = req.file.path;
      pdfFileName = req.file.originalname;
      console.log('Processing uploaded file:', pdfFileName);
    } else if (req.body.useDefault === 'true') {
      // Use default file if explicitly requested
      pdfPath = path.join(__dirname, '../doc/Motor-Vehicle-Insurance.pdf');
      pdfFileName = 'Motor-Vehicle-Insurance.pdf';
      console.log('Processing default file:', pdfFileName);
    } else {
      return res.status(400).json({
        error: "No file uploaded",
        message: "Please upload a PDF file or set 'useDefault' to 'true' to use the default document"
      });
    }

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        error: "File not found",
        message: `The file ${pdfFileName} does not exist`
      });
    }

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
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        success: false,
        error: "Qdrant service unavailable", 
        message: "Document processing service is not available. Please ensure Qdrant is running." 
      });
    }

    console.log("✅ Qdrant is available, processing document...");
    await qdrant.initializeCollection(768); // Initialize collection if needed
    
    let processedCount = 0;
    const batchSize = 5; // Process in smaller batches
    const fileSize = pdfText.length;
    
    for (let i = 0; i < splitContext.length; i += batchSize) {
      const batch = splitContext.slice(i, i + batchSize);
      
      for (const line of batch) {
        if (line.trim()) {
          try {
            // Create embedding
            const embedding = await createEmbedding(line);
            
            // Create document metadata
            const documentMetadata = {
              name: pdfFileName,
              originalName: req.file ? req.file.originalname : pdfFileName,
              content: line,
              timestamp: new Date().toISOString(),
              chunk_index: processedCount,
              source_file: pdfFileName,
              fileSize: processedCount === 0 ? fileSize : undefined, // Only set on first chunk
              chunkCount: processedCount === 0 ? splitContext.filter(l => l.trim()).length : undefined,
              status: 'processed',
              mimeType: 'application/pdf'
            };
            
            const documentPointId = uuidv4();
            
            // Store everything in Qdrant
            await qdrant.addDocument(documentPointId, embedding, documentMetadata);
            
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
    
    const message = `PDF "${pdfFileName}" parsed and saved successfully. ${processedCount} chunks stored in Qdrant.`;
    
    // Clean up uploaded file after processing (optional)
    if (req.file && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        console.log('Uploaded file cleaned up:', pdfPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError.message);
      }
    }
    
    res.status(200).json({
      success: true,
      message: message,
      data: {
        id: uuidv4(),
        filename: pdfFileName,
        originalName: req.file ? req.file.originalname : pdfFileName,
        size: fileSize,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        processedAt: new Date(),
        status: 'processed',
        chunkCount: processedCount
      },
      chunks_processed: processedCount,
      storage_type: "qdrant"
    });
    
  } catch (error) {
    console.error("Error loading or parsing PDF:", error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Uploaded file cleaned up after error:', req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file after error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      error: "Failed to load or parse PDF",
      message: error.message,
      filename: req.file ? req.file.originalname : 'unknown'
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
router.post("/conversation", async (req, res) => {
  try {
    let sessionId = req.body.sessionId;
    const message = req.body.message;
    const selectedDocument = req.body.selectedDocument; // Optional document filter
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Qdrant service unavailable", 
        message: "Conversation service is not available" 
      });
    }

    // Initialize collections
    await qdrant.initializeCollection(768, "sessions");
    await qdrant.initializeCollection(768, "conversations");
    
    if (!sessionId) {
      // Create new session in Qdrant
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a dummy vector for session storage
      const sessionVector = new Array(768).fill(0);
      
      // Generate UUID for Qdrant point ID
      const sessionPointId = uuidv4();
      
      // Store session in Qdrant
      await qdrant.addDocumentToCollection("sessions", sessionPointId, sessionVector, {
        sessionId: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: "session"
      });
      
      console.log("New session created:", sessionId);
    } else {
      // Verify session exists in Qdrant
      try {
        const sessionExists = await qdrant.searchInCollection("sessions", new Array(768).fill(0), 1, {
          sessionId: sessionId
        });
        
        if (!sessionExists || sessionExists.length === 0) {
          return res.status(404).json({
            message: "Session not found"
          });
        }
        console.log("Session found:", sessionId);
      } catch (error) {
        return res.status(404).json({
          message: "Session not found"
        });
      }
    }

    // Create embedding for the message
    console.log('Creating embedding for message:', message);
    const messageVector = await createEmbedding(message);
    console.log('Embedding created, vector length:', messageVector.length);
    
    // Store user message in Qdrant conversations collection with error handling
    const userMessagePointId = uuidv4();
    try {
      await qdrant.addDocumentToCollection("conversations", userMessagePointId, messageVector, {
        sessionId: sessionId,
        message: message,
        role: "user",
        createdAt: new Date().toISOString(),
        type: "conversation"
      });
    } catch (error) {
      console.error("Failed to store user message in Qdrant:", error.message);
      // Continue processing even if storage fails
    }

    // Perform vector search on documents collection with optional document filter
    let finalResult = [];
    
    try {
      console.log('Selected document for search:', selectedDocument);
      
      // First, try an unfiltered search to verify basic functionality
      console.log('Testing unfiltered search first...');
      const testResults = await qdrant.search(messageVector, 3);
      console.log(`Unfiltered search returned ${testResults.length} results`);
      if (testResults.length > 0) {
        console.log('Sample result fields:', Object.keys(testResults[0].metadata || {}));
        console.log('Sample document_name:', testResults[0].document_name);
        console.log('Sample name field:', testResults[0].metadata?.name);
      }
      
      let searchResults;
      if (selectedDocument) {
        // Try filtering by document_name first
        console.log('Performing filtered search for document:', selectedDocument);
        searchResults = await qdrant.searchWithFilter(messageVector, { 
          document_name: selectedDocument 
        }, 10);
        
        // If no results found, try filtering by 'name' field as fallback
        if (searchResults.length === 0) {
          console.log('No results with document_name filter, trying name filter...');
          // Create a custom filter for the 'name' field
          const nameFilter = {
            must: [
              {
                key: 'name',
                match: { value: selectedDocument }
              }
            ]
          };
          searchResults = await qdrant.search(messageVector, 10, nameFilter);
        }
      } else {
        // Use regular search for all documents
        console.log('Performing unfiltered search across all documents');
        searchResults = await qdrant.search(messageVector, 10);
      }
      
      console.log(`Found ${searchResults.length} search results`);
      
      finalResult = searchResults.map(doc => ({
        text: doc.content,
        score: doc.score,
        documentName: doc.document_name || doc.metadata?.name || 'Unknown',
        timestamp: doc.timestamp
      }));
      
      // If no results found and a document was selected, provide helpful message
      if (finalResult.length === 0 && selectedDocument) {
        return res.json({
          sessionId: sessionId,
          message: `I couldn't find relevant information about "${message}" in the selected document "${selectedDocument}". Please try rephrasing your question or select a different document.`,
          context_documents: 0,
          selectedDocument: selectedDocument,
          search_type: 'qdrant_filtered'
        });
      }
      
      // If no results found and no document selected, suggest selecting a document
      if (finalResult.length === 0) {
        return res.json({
          sessionId: sessionId,
          message: "I couldn't find relevant information to answer your question. Please make sure you have uploaded documents and try selecting a specific document to search within.",
          context_documents: 0,
          search_type: 'qdrant'
        });
      }
      
    } catch (qdrantError) {
      console.error("Qdrant search failed:", qdrantError);
      return res.status(500).json({
        error: "Search failed",
        message: "Unable to retrieve relevant documents"
      });
    }
 // Generate AI response using Google Generative AI
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    // Generate AI response using Ollama
//     const axios = require('axios');
    
     const contextText = finalResult.map(doc => doc.text).join("\n");
     const prompt = `You are a humble helper who can answer questions asked by users from the given context.

Context:
${contextText}

User Question: ${message}

Please provide a helpful answer based on the context provided.`;

//     const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
//       model: 'llama3.2', // You can change this to your preferred model
//       prompt: prompt,
//       stream: false
//     });
    
//     const chat = ollamaResponse.data.response;

    const result = await model.generateContent(prompt);
    const chat = result.response.text();

    // Store AI response in Qdrant conversations collection with error handling
    const aiResponseVector = await createEmbedding(chat);
    const aiMessagePointId = uuidv4();
    try {
      await qdrant.addDocumentToCollection("conversations", aiMessagePointId, aiResponseVector, {
        sessionId: sessionId,
        message: chat,
        role: "assistant",
        createdAt: new Date().toISOString(),
        type: "conversation"
      });
    } catch (error) {
      console.error("Failed to store AI response in Qdrant:", error.message);
      // Continue and return response even if storage fails
    }

    return res.json({
      sessionId: sessionId,
      message: chat,
      context_documents: finalResult.length,
      selectedDocument: selectedDocument,
      sources: finalResult.map(doc => ({
        documentName: doc.documentName,
        relevanceScore: doc.score,
        excerpt: doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : ''),
        timestamp: doc.timestamp
      })),
      search_type: selectedDocument ? 'qdrant_filtered' : 'qdrant'
    });
    
  } catch (error) {
    console.error("Error in conversation:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
})

// Get all uploaded documents
router.get('/documents', async function(req, res, next) {
  try {
    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        success: false,
        error: "Qdrant service unavailable", 
        message: "Document service is not available" 
      });
    }

    const documents = await qdrant.getDocuments();
    
    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
    
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch documents", 
      message: error.message 
    });
  }
});

// Get document details by name
router.get('/documents/:name', async function(req, res, next) {
  try {
    const documentName = req.params.name;
    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        success: false,
        error: "Qdrant service unavailable", 
        message: "Document service is not available" 
      });
    }

    const documentInfo = await qdrant.getDocumentByName(documentName);
    
    if (!documentInfo) {
      return res.status(404).json({ 
        success: false,
        error: "Document not found",
        message: `Document with name ${documentName} not found` 
      });
    }
    
    res.json({
      success: true,
      data: documentInfo
    });
    
  } catch (error) {
    console.error("Error fetching document details:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch document details", 
      message: error.message 
    });
  }
});

// Search route for full-text search
router.get('/search', async function(req, res, next) {
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
        message: "Search service is not available" 
      });
    }

    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Use basic vector search for text search
    const searchResults = await qdrant.search(queryEmbedding, limit);
    
    res.json({
      query: query,
      results: searchResults.map(result => ({
        id: result.id,
        content: result.content,
        score: result.score,
        name: result.metadata?.document_name || 'Unknown',
        timestamp: result.metadata?.timestamp
      })),
      count: searchResults.length,
      searchType: "text"
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
        message: "Search service is not available" 
      });
    }

    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Use Qdrant for similarity search
    const searchResults = await qdrant.search(queryEmbedding, limit);
    
    res.json({
      query: query,
      results: searchResults.map(result => ({
        id: result.id,
        content: result.content,
        score: result.score,
        name: result.metadata?.document_name || 'Unknown',
        timestamp: result.metadata?.timestamp
      })),
      count: searchResults.length,
      searchType: "similarity"
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
