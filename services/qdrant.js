// Qdrant Vector Database Client
const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

class QdrantService {
  constructor() {
    this.client = new QdrantClient({ 
      url: process.env.QDRANT_URL || 'http://localhost:6333' 
    });
    this.collectionName = process.env.QDRANT_COLLECTION_NAME || 'documents_vectors';
  }

  // Initialize collection with proper configuration
  async initializeCollection(vectorSize = 768) {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!collectionExists) {
        console.log(`Creating collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine', // Options: 'Dot', 'Cosine', 'Euclid'
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        console.log(`✅ Collection ${this.collectionName} created successfully`);
      } else {
        console.log(`Collection ${this.collectionName} already exists`);
      }

      // Create index for better performance
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'document_name',
        field_schema: 'keyword',
      });

      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'timestamp',
        field_schema: 'datetime',
      });

      console.log('✅ Payload indexes created');
    } catch (error) {
      console.error('Error initializing collection:', error);
      throw error;
    }
  }

  // Add document with vector
  async addDocument(id, vector, metadata) {
    try {
      const point = {
        id: id,
        vector: vector,
        payload: {
          content: metadata.content,
          document_name: metadata.name,
          original_name: metadata.originalName || metadata.name,
          file_size: metadata.fileSize || 0,
          chunk_count: metadata.chunkCount || 1,
          status: metadata.status || 'processed',
          mime_type: metadata.mimeType || 'application/pdf',
          timestamp: metadata.timestamp || new Date().toISOString(),
          ...metadata
        }
      };

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [point]
      });

      console.log(`✅ Document ${id} added to Qdrant`);
      return { success: true, id };
    } catch (error) {
      console.error('Error adding document to Qdrant:', error);
      throw error;
    }
  }

  // Batch add documents
  async addDocuments(documents) {
    try {
      const points = documents.map(doc => ({
        id: doc.id,
        vector: doc.vector,
        payload: {
          content: doc.metadata.content,
          document_name: doc.metadata.name,
          timestamp: doc.metadata.timestamp || new Date().toISOString(),
          ...doc.metadata
        }
      }));

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points
      });

      console.log(`✅ ${documents.length} documents added to Qdrant`);
      return { success: true, count: documents.length };
    } catch (error) {
      console.error('Error batch adding documents to Qdrant:', error);
      throw error;
    }
  }

  // Vector similarity search
  async search(queryVector, limit = 10, filter = null) {
    try {
      const searchParams = {
        vector: queryVector,
        limit: limit,
        with_payload: true,
        with_vector: false
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const searchResult = await this.client.search(this.collectionName, searchParams);
      
      return searchResult.map(result => ({
        id: result.id,
        score: result.score,
        content: result.payload.content,
        document_name: result.payload.document_name,
        timestamp: result.payload.timestamp,
        metadata: result.payload
      }));
    } catch (error) {
      console.error('Error performing vector search:', error);
      throw error;
    }
  }

  // Search with filters
  async searchWithFilter(queryVector, filters = {}, limit = 10) {
    try {
      const filter = {};
      
      if (filters.document_name) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'document_name',
          match: { value: filters.document_name }
        });
      }

      if (filters.date_from || filters.date_to) {
        filter.must = filter.must || [];
        const dateRange = {};
        if (filters.date_from) dateRange.gte = filters.date_from;
        if (filters.date_to) dateRange.lte = filters.date_to;
        
        filter.must.push({
          key: 'timestamp',
          range: dateRange
        });
      }

      return await this.search(queryVector, limit, Object.keys(filter).length > 0 ? filter : null);
    } catch (error) {
      console.error('Error performing filtered search:', error);
      throw error;
    }
  }

  // Get collection info
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      console.error('Error getting collection info:', error);
      throw error;
    }
  }

  // Delete document
  async deleteDocument(id) {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id]
      });
      console.log(`✅ Document ${id} deleted from Qdrant`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting document from Qdrant:', error);
      throw error;
    }
  }

  // Delete collection
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`✅ Collection ${this.collectionName} deleted`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const health = await this.client.api('cluster');
      return { status: 'healthy', details: health };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Initialize collection with custom name
  async initializeCollection(vectorSize = 768, collectionName = null) {
    const targetCollection = collectionName || this.collectionName;
    
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === targetCollection
      );

      if (!collectionExists) {
        console.log(`Creating collection: ${targetCollection}`);
        await this.client.createCollection(targetCollection, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        console.log(`✅ Collection ${targetCollection} created successfully`);
      } else {
        console.log(`Collection ${targetCollection} already exists`);
      }

      // Create indexes for better performance
      await this.client.createPayloadIndex(targetCollection, {
        field_name: 'sessionId',
        field_schema: 'keyword',
      });

      await this.client.createPayloadIndex(targetCollection, {
        field_name: 'type',
        field_schema: 'keyword',
      });

      await this.client.createPayloadIndex(targetCollection, {
        field_name: 'role',
        field_schema: 'keyword',
      });

      console.log(`✅ Payload indexes created for ${targetCollection}`);
    } catch (error) {
      console.error(`Error initializing collection ${targetCollection}:`, error);
      throw error;
    }
  }

  // Add document to specific collection with retry logic
  async addDocumentToCollection(collectionName, id, vector, metadata) {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const point = {
          id: id,
          vector: vector,
          payload: {
            content: metadata.content,
            document_name: metadata.name,
            timestamp: metadata.timestamp || new Date().toISOString(),
            ...metadata
          }
        };

        await this.client.upsert(collectionName, {
          wait: true,
          points: [point]
        });

        console.log(`✅ Document ${id} added to Qdrant collection ${collectionName}`);
        return { success: true, id };
      } catch (error) {
        retries++;
        console.error(`Error adding document to Qdrant collection ${collectionName} (attempt ${retries}/${maxRetries}):`, error.message);
        
        if (retries >= maxRetries) {
          throw new Error(`Failed to add document after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  // Search in specific collection with filters
  async searchInCollection(collectionName, queryVector, limit = 10, filters = {}) {
    try {
      const searchParams = {
        vector: queryVector,
        limit: limit,
        with_payload: true,
        with_vector: false
      };

      if (Object.keys(filters).length > 0) {
        searchParams.filter = {
          must: Object.entries(filters).map(([key, value]) => ({
            key: key,
            match: { value: value }
          }))
        };
      }

      const searchResult = await this.client.search(collectionName, searchParams);
      
      return searchResult.map(result => ({
        id: result.id,
        score: result.score,
        content: result.payload.content,
        metadata: result.payload
      }));
    } catch (error) {
      console.error(`Error searching in collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Get all documents with metadata
  async getDocuments() {
    try {
      // Scroll through all points to get document metadata
      const scrollResult = await this.client.scroll(this.collectionName, {
        limit: 1000,
        with_payload: true,
        with_vector: false
      });

      const documents = new Map();
      
      scrollResult.points.forEach(point => {
        const docName = point.payload.document_name;
        if (!documents.has(docName)) {
          documents.set(docName, {
            id: point.id,
            filename: docName,
            originalName: point.payload.original_name || docName,
            size: point.payload.file_size || 0,
            mimeType: point.payload.mime_type || 'application/pdf',
            uploadedAt: new Date(point.payload.timestamp),
            status: point.payload.status || 'processed',
            chunkCount: 1
          });
        } else {
          // Increment chunk count
          documents.get(docName).chunkCount++;
        }
      });

      return Array.from(documents.values());
    } catch (error) {
      console.error('Error fetching documents from Qdrant:', error);
      throw error;
    }
  }

  // Get specific document details
  async getDocumentByName(documentName) {
    try {
      const searchResult = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'document_name',
              match: { value: documentName }
            }
          ]
        },
        limit: 1000,
        with_payload: true,
        with_vector: false
      });

      if (searchResult.points.length === 0) {
        return null;
      }

      const chunks = searchResult.points.map(point => ({
        id: point.id,
        content: point.payload.content,
        timestamp: point.payload.timestamp
      }));

      const firstPoint = searchResult.points[0];
      return {
        id: firstPoint.id,
        filename: documentName,
        originalName: firstPoint.payload.original_name || documentName,
        size: firstPoint.payload.file_size || 0,
        mimeType: firstPoint.payload.mime_type || 'application/pdf',
        uploadedAt: new Date(firstPoint.payload.timestamp),
        status: firstPoint.payload.status || 'processed',
        chunkCount: chunks.length,
        chunks: chunks
      };
    } catch (error) {
      console.error('Error fetching document details from Qdrant:', error);
      throw error;
    }
  }

  // Delete document by name
  async deleteDocument(documentName) {
    try {
      const searchResult = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'document_name',
              match: { value: documentName }
            }
          ]
        },
        limit: 1000,
        with_payload: false,
        with_vector: false
      });

      if (searchResult.points.length === 0) {
        return { success: false, message: 'Document not found' };
      }

      const pointIds = searchResult.points.map(point => point.id);
      
      await this.client.delete(this.collectionName, {
        points: pointIds
      });

      console.log(`✅ Document ${documentName} deleted from Qdrant`);
      return { success: true, deletedChunks: pointIds.length };
    } catch (error) {
      console.error('Error deleting document from Qdrant:', error);
      throw error;
    }
  }
}

module.exports = QdrantService;
