var express = require('express');
var router = express.Router();
const { createEmbeddingWithProvider } = require("./embedings");
const QdrantService = require("../services/qdrant");

// Import AI provider functions with fallback handling
let getActiveProvider, getProviderConfig;
try {
  const aiProviders = require('./ai-providers');
  getActiveProvider = aiProviders.getActiveProvider;
  getProviderConfig = aiProviders.getProviderConfig;
} catch (error) {
  console.warn('AI providers module not found, using default embedding provider');
  getActiveProvider = () => 'google';
  getProviderConfig = () => null;
}
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

// Import the new document processor
const DocumentProcessor = require('../services/documentProcessor');
const docProcessor = new DocumentProcessor();

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Allow multiple file formats
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'text/markdown', // .md
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'text/csv', // .csv
      'application/csv', // .csv
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Supported formats: PDF, DOCX, DOC, TXT, MD, PPTX, PPT, CSV, XLSX, XLS'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // Increased to 25MB limit for larger documents
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
// Add endpoint to get supported formats
router.get('/supported-formats', (req, res) => {
  const formats = docProcessor.getSupportedFormats();
  res.json({
    success: true,
    data: formats
  });
});

router.post('/Load-document', upload.single('documentFile'), async function(req, res, next) {
  try {
    let filePath;
    let fileName;
    let mimeType;
    
    // Check if file was uploaded or use default path
    if (req.file) {
      // Use uploaded file
      filePath = req.file.path;
      fileName = req.file.originalname;
      mimeType = req.file.mimetype;
      console.log(`Processing uploaded ${docProcessor.getFormatInfo(mimeType)?.description || 'file'}:`, fileName);
    } else if (req.body.useDefault === 'true') {
      // Use default file if explicitly requested
      filePath = path.join(__dirname, '../doc/Motor-Vehicle-Insurance.pdf');
      fileName = 'Motor-Vehicle-Insurance.pdf';
      mimeType = 'application/pdf';
      console.log('Processing default file:', fileName);
    } else {
      return res.status(400).json({
        error: "No file uploaded",
        message: "Please upload a document file or set 'useDefault' to 'true' to use the default document"
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "File not found",
        message: `The file ${fileName} does not exist`
      });
    }

    // Check if format is supported
    if (!docProcessor.isFormatSupported(mimeType)) {
      return res.status(400).json({
        error: "Unsupported file format",
        message: `File format ${mimeType} is not supported`,
        supportedFormats: docProcessor.getSupportedFormats()
      });
    }

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Process document using the new processor
    const processingResult = await docProcessor.processDocument(filePath, fileName, mimeType);
    const documentText = processingResult.text;
    
    // Write extracted text to file
    await fs.writeFileSync("./context.txt", documentText);
    console.log(`Extracted text from ${docProcessor.getFormatInfo(mimeType).description}:`, documentText.substring(0, 200));
    
    // Use intelligent chunking
    const chunks = await docProcessor.intelligentChunking(documentText, fileName);
    console.log(`Document split into ${chunks.length} intelligent chunks`);
    
    // Generate AI-powered summary and keywords
    const [summary, keywords] = await Promise.all([
      docProcessor.generateDocumentSummary(documentText, fileName, mimeType),
      docProcessor.extractKeywords(documentText, fileName)
    ]);
    
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
    const textLength = documentText.length;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      for (const chunk of batch) {
        if (chunk.trim()) {
          try {
            // Create embedding using selected AI provider
            const activeProvider = getActiveProvider();
            const providerConfig = getProviderConfig(activeProvider);
            const embedding = await createEmbeddingWithProvider(chunk, activeProvider, providerConfig);
            
            // Enhanced document metadata with AI insights
            const documentMetadata = {
              name: fileName,
              originalName: req.file ? req.file.originalname : fileName,
              content: chunk,
              timestamp: new Date().toISOString(),
              chunk_index: processedCount,
              source_file: fileName,
              fileSize: processedCount === 0 ? fileSize : undefined, // Only set on first chunk
              chunkCount: processedCount === 0 ? chunks.length : undefined,
              status: 'processed',
              mimeType: mimeType,
              documentMetadata: processedCount === 0 ? processingResult.metadata : undefined,
              summary: processedCount === 0 ? summary : undefined,
              keywords: processedCount === 0 ? keywords : undefined,
              processedBy: getActiveProvider()
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
    
    const formatInfo = docProcessor.getFormatInfo(mimeType);
    const message = `${formatInfo.description} "${fileName}" processed and saved successfully. ${processedCount} chunks stored in Qdrant.`;
    
    // Clean up uploaded file after processing (optional)
    if (req.file && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Uploaded file cleaned up:', filePath);
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError.message);
      }
    }
    
    res.status(200).json({
      success: true,
      message: message,
      data: {
        id: uuidv4(),
        filename: fileName,
        originalName: req.file ? req.file.originalname : fileName,
        size: fileSize,
        mimeType: mimeType,
        uploadedAt: new Date(),
        processedAt: new Date(),
        status: 'processed',
        chunkCount: processedCount,
        documentType: formatInfo.description,
        metadata: processingResult.metadata,
        summary: summary,
        keywords: keywords,
        processedBy: getActiveProvider()
      },
      chunks_processed: processedCount,
      storage_type: "qdrant",
      ai_provider: getActiveProvider()
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
      error: "Failed to load or parse document",
      message: error.message,
      filename: req.file ? req.file.originalname : 'unknown',
      supportedFormats: docProcessor.getSupportedFormats()
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
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const embedding = await createEmbeddingWithProvider(text, activeProvider, providerConfig);
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

    // Create embedding for the message using selected AI provider
    console.log('Creating embedding for message:', message);
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const messageVector = await createEmbeddingWithProvider(message, activeProvider, providerConfig);
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
        console.log('Message vector length:', messageVector.length);
        console.log('Available documents from earlier test:', testResults.map(r => r.document_name).slice(0, 5));
        
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
 // Generate AI response using the selected provider
    const { generateAIResponse } = require('./ai-providers');
    
    const contextText = finalResult.map(doc => doc.text).join("\n");
    const chat = await generateAIResponse(message, contextText);

    // Store AI response in Qdrant conversations collection with error handling
    const aiResponseVector = await createEmbeddingWithProvider(chat, activeProvider, providerConfig);
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

    // Create embedding for the query using selected AI provider
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryEmbedding = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
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

    // Create embedding for the query using selected AI provider
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryEmbedding = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
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
    
    // Create embedding for the query using selected AI provider
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryVector = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
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
    
    // Create embedding for the query using selected AI provider
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryVector = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
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

// Get uploaded files
router.get('/uploaded-files', async function(req, res, next) {
  try {
    const qdrant = new QdrantService();
    
    const fileMap = new Map();
    let searchResults = [];

    // Try to get documents from Qdrant first
    try {
      const qdrantHealth = await qdrant.healthCheck();
      console.log('Qdrant health check:', qdrantHealth);
      if (qdrantHealth.status === 'healthy') {
        const qdrantDocuments = await qdrant.getDocuments();
        console.log('Qdrant documents found:', qdrantDocuments.length);
        
        // Add Qdrant documents to the file map
        qdrantDocuments.forEach(doc => {
          fileMap.set(doc.filename, {
            id: doc.filename,
            name: doc.filename, // Use filename as name
            originalName: doc.originalName,
            type: doc.mimeType, // Map mimeType to type
            size: doc.size || 0,
            uploadedAt: doc.uploadedAt,
            chunkCount: doc.chunkCount || 0,
            summary: doc.summary || '',
            keywords: doc.keywords || [],
            status: 'processed',
            processedBy: doc.processedBy || 'Unknown'
          });
        });
      }
    } catch (qdrantError) {
      console.log('Qdrant not available or getDocuments failed:', qdrantError.message);
      console.error('Qdrant error details:', qdrantError);
    }

    // Also check physical files in uploads directory
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      if (fs.existsSync(uploadsDir)) {
        const uploadedFiles = fs.readdirSync(uploadsDir);
        
        uploadedFiles.forEach(filename => {
          // Extract original filename (remove timestamp prefix)
          const originalName = filename.replace(/^\d+-\d+-/, '');
          
          if (!fileMap.has(originalName)) {
            const filePath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filePath);
            
            // Determine file type from extension
            const ext = path.extname(originalName).toLowerCase();
            let mimeType = 'application/octet-stream';
            
            const mimeTypes = {
              '.pdf': 'application/pdf',
              '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              '.doc': 'application/msword',
              '.txt': 'text/plain',
              '.md': 'text/markdown',
              '.csv': 'text/csv',
              '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              '.xls': 'application/vnd.ms-excel',
              '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              '.ppt': 'application/vnd.ms-powerpoint'
            };
            
            mimeType = mimeTypes[ext] || mimeType;
            
            fileMap.set(originalName, {
              id: originalName,
              name: originalName,
              type: mimeType,
              size: stats.size,
              uploadedAt: stats.birthtime || stats.mtime,
              chunkCount: 0, // Unknown, as it's not in Qdrant
              summary: '',
              keywords: [],
              status: 'uploaded' // File exists but may not be processed in Qdrant
            });
          }
        });
      }
    } catch (fileError) {
      console.log("Error reading uploads directory:", fileError.message);
    }

    // Convert map to array
    const filesArray = Array.from(fileMap.values());
    
    console.log('Final files array:', filesArray.length, 'documents');
    console.log('File names:', filesArray.map(f => f.name));
    
    res.json({
      files: filesArray,
      total: filesArray.length
    });
    
  } catch (error) {
    console.error("Error getting uploaded files:", error);
    res.status(500).json({ 
      error: "Failed to retrieve files", 
      message: error.message 
    });
  }
});

// Delete uploaded file
router.delete('/uploaded-files/:fileId', async function(req, res, next) {
  try {
    const fileId = req.params.fileId;
    
    if (!fileId) {
      return res.status(400).json({ error: "File ID is required" });
    }

    const qdrant = new QdrantService();
    
    // Check if Qdrant is available
    const qdrantHealth = await qdrant.healthCheck();
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Qdrant service unavailable", 
        message: "File deletion service is not available" 
      });
    }

    // Search for all chunks of this document
    const searchResults = await qdrant.searchInCollection(
      qdrant.collectionName,
      new Array(768).fill(0), // Dummy vector
      1000, // Get many results
      { 
        "document_name": fileId
      },
      0.0 // Very low threshold
    );

    if (searchResults.length === 0) {
      return res.status(404).json({ 
        error: "File not found",
        message: `No document found with name: ${fileId}`
      });
    }

    // Delete all points for this document
    const pointIds = searchResults.map(result => result.id);
    
    // Delete points in batches
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < pointIds.length; i += batchSize) {
      const batch = pointIds.slice(i, i + batchSize);
      try {
        await qdrant.deletePoints(qdrant.collectionName, batch);
        deletedCount += batch.length;
        console.log(`Deleted batch of ${batch.length} points for document: ${fileId}`);
      } catch (error) {
        console.error(`Failed to delete batch starting at index ${i}:`, error);
      }
    }

    // Also try to delete the physical file if it exists
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      // Find files that match the document name
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const matchingFiles = files.filter(file => file.includes(fileId));
        
        for (const file of matchingFiles) {
          const filePath = path.join(uploadsDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted physical file: ${filePath}`);
          }
        }
      }
    } catch (fileError) {
      console.warn(`Could not delete physical file for ${fileId}:`, fileError.message);
    }

    res.json({
      message: `Document "${fileId}" deleted successfully`,
      deletedChunks: deletedCount,
      documentName: fileId
    });
    
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ 
      error: "Failed to delete file", 
      message: error.message 
    });
  }
});

module.exports = router;
