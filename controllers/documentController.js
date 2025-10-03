// controllers/documentController.js
const QdrantService = require('../services/qdrant');
const DocumentProcessor = require('../services/documentProcessor');
const { createEmbeddingWithProvider } = require("../routes/embedings");
const { v4: uuidv4 } = require('uuid');
const fs = require("fs");
const path = require('path');

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

const docProcessor = new DocumentProcessor();

class DocumentController {

  // GET /supported-formats - Get supported document formats
  static getSupportedFormats(req, res) {
    try {
      const formats = docProcessor.getSupportedFormats();
      res.json({
        success: true,
        data: formats
      });
    } catch (error) {
      console.error("Error getting supported formats:", error);
      res.status(500).json({
        error: "Failed to get supported formats",
        message: error.message
      });
    }
  }

  // POST /documents/upload - Upload and process document
  static async uploadDocument(req, res) {
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
          error: "Vector database service unavailable", 
          message: "Document processing service is not available. Please try again later." 
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
          try {
            // Create embedding for each chunk using selected AI provider
            const activeProvider = getActiveProvider();
            const providerConfig = getProviderConfig(activeProvider);
            const embedding = await createEmbeddingWithProvider(chunk.text, activeProvider, providerConfig);
            
            // Generate a unique ID for each chunk
            const chunkId = uuidv4();
            
            // Add document chunk to Qdrant with metadata
            await qdrant.addDocumentToCollection(qdrant.collectionName, chunkId, embedding, {
              document_name: fileName,
              chunk_index: chunk.index,
              chunk_text: chunk.text,
              timestamp: new Date().toISOString(),
              file_size: fileSize,
              mime_type: mimeType,
              processing_metadata: {
                ai_provider: activeProvider,
                chunk_method: chunk.method || 'intelligent',
                summary: chunk.summary || '',
                keywords: chunk.keywords || []
              }
            });
            
            processedCount++;
            console.log(`Processed chunk ${processedCount}/${chunks.length} for ${fileName}`);
            
          } catch (chunkError) {
            console.error(`Error processing chunk ${chunk.index}:`, chunkError);
          }
        }
        
        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
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
          console.warn('Could not clean up uploaded file:', cleanupError.message);
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
      console.error("Error loading or parsing document:", error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Uploaded file cleaned up after error:', req.file.path);
        } catch (cleanupError) {
          console.warn('Could not clean up uploaded file after error:', cleanupError.message);
        }
      }
      
      res.status(500).json({
        error: "Failed to load or parse document",
        message: error.message,
        filename: req.file ? req.file.originalname : 'unknown',
        supportedFormats: docProcessor.getSupportedFormats()
      });
    }
  }

  // GET /documents - Get all uploaded documents
  static async getDocuments(req, res) {
    try {
      const qdrant = new QdrantService();
      
      // Check if Qdrant is available
      const qdrantHealth = await qdrant.healthCheck();
      if (qdrantHealth.status !== 'healthy') {
        return res.status(503).json({ 
          error: "Vector database service unavailable", 
          message: "Document retrieval service is not available" 
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
  }

  // GET /documents/:name - Get document details by name
  static async getDocumentByName(req, res) {
    try {
      const documentName = req.params.name;
      const qdrant = new QdrantService();
      
      // Check if Qdrant is available
      const qdrantHealth = await qdrant.healthCheck();
      if (qdrantHealth.status !== 'healthy') {
        return res.status(503).json({ 
          error: "Vector database service unavailable", 
          message: "Document retrieval service is not available" 
        });
      }

      const documentInfo = await qdrant.getDocumentByName(documentName);
      
      if (!documentInfo) {
        return res.status(404).json({ 
          success: false,
          error: "Document not found", 
          message: `Document "${documentName}" not found` 
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
  }

  // GET /documents/uploaded-files - Get uploaded files (legacy endpoint)
  static async getUploadedFiles(req, res) {
    try {
      const qdrant = new QdrantService();
      
      const fileMap = new Map();
      let searchResults = [];

      // Try to get documents from Qdrant first
      try {
        const qdrantHealth = await qdrant.healthCheck();
        if (qdrantHealth.status === 'healthy') {
          searchResults = await qdrant.searchInCollection(
            qdrant.collectionName,
            new Array(768).fill(0),
            1000,
            {},
            0.0
          );
          
          console.log('Found documents in Qdrant:', searchResults.length);
          
          // Group by document name
          searchResults.forEach(result => {
            const docName = result.metadata?.document_name || result.payload?.document_name || 'Unknown';
            
            if (!fileMap.has(docName)) {
              fileMap.set(docName, {
                id: docName,
                name: docName,
                chunks: 0,
                size: result.metadata?.file_size || result.payload?.file_size || 0,
                mimeType: result.metadata?.mime_type || result.payload?.mime_type || 'unknown',
                timestamp: result.metadata?.timestamp || result.payload?.timestamp || new Date().toISOString(),
                source: 'qdrant'
              });
            }
            
            const fileInfo = fileMap.get(docName);
            fileInfo.chunks++;
          });
        }
      } catch (qdrantError) {
        console.warn('Qdrant search error:', qdrantError.message);
      }

      // Also check physical files in uploads directory
      try {
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          
          files.forEach(filename => {
            if (!fileMap.has(filename)) {
              const filePath = path.join(uploadsDir, filename);
              const stats = fs.statSync(filePath);
              
              fileMap.set(filename, {
                id: filename,
                name: filename,
                chunks: 0,
                size: stats.size,
                mimeType: 'unknown',
                timestamp: stats.mtime.toISOString(),
                source: 'filesystem'
              });
            }
          });
        }
      } catch (fileError) {
        console.warn('File system check error:', fileError.message);
      }

      // Convert map to array
      const filesArray = Array.from(fileMap.values());
      
      console.log('Final files array:', filesArray.length, 'documents');
      
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
  }

  // DELETE /documents/:fileId - Delete uploaded file
  static async deleteDocument(req, res) {
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
          error: "Vector database service unavailable", 
          message: "Document deletion service is not available" 
        });
      }

      // Use the Qdrant service's delete method
      const deleteResult = await qdrant.deleteDocumentByName(fileId);
      
      if (!deleteResult.success) {
        return res.status(404).json({
          error: "Document not found",
          message: deleteResult.message || `Document "${fileId}" not found`
        });
      }

      // Also try to delete the physical file if it exists
      try {
        const uploadsDir = path.join(__dirname, '../uploads');
        const physicalFiles = fs.readdirSync(uploadsDir).filter(f => f.includes(fileId));
        
        for (const file of physicalFiles) {
          const filePath = path.join(uploadsDir, file);
          fs.unlinkSync(filePath);
          console.log('Deleted physical file:', filePath);
        }
      } catch (fileError) {
        console.warn('Could not delete physical file:', fileError.message);
      }

      res.json({
        message: `Document "${fileId}" deleted successfully`,
        deletedChunks: deleteResult.deletedChunks || 0,
        documentName: fileId
      });
      
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ 
        error: "Failed to delete document", 
        message: error.message 
      });
    }
  }
}

module.exports = DocumentController;