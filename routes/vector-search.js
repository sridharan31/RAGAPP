// Advanced Vector Search Routes for MongoDB Atlas
const express = require('express');
const router = express.Router();
const mongodb = require("mongodb");
const createEmbedding = require("./embedings");

// MongoDB Atlas Vector Search route
router.get('/vector-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;
    
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
    
    // MongoDB Atlas Vector Search aggregation pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_search_index", // Name of your vector search index
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100, // Number of candidates to consider
          limit: limit,
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          content: 1,
          timestamp: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];
    
    const searchResults = await collection.aggregate(pipeline).toArray();
    
    await connection.close();
    
    res.json({
      query: query,
      results: searchResults,
      count: searchResults.length,
      searchType: "vector"
    });
    
  } catch (error) {
    console.error("Error performing vector search:", error);
    res.status(500).json({ 
      error: "Vector search failed", 
      message: error.message 
    });
  }
});

// Hybrid Search (combines text and vector search)
router.get('/hybrid-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;
    
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
    
    // Hybrid search: combines vector search with text search
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_search_index",
          path: "embedding", 
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit * 2, // Get more candidates for hybrid scoring
          filter: {
            $or: [
              { name: { $regex: query, $options: "i" } },
              { content: { $regex: query, $options: "i" } }
            ]
          }
        }
      },
      {
        $addFields: {
          vectorScore: { $meta: "vectorSearchScore" },
          textRelevance: {
            $cond: {
              if: { $regexMatch: { input: "$content", regex: query, options: "i" } },
              then: 1,
              else: 0
            }
          }
        }
      },
      {
        $addFields: {
          hybridScore: {
            $add: [
              { $multiply: ["$vectorScore", 0.7] }, // 70% weight for vector similarity
              { $multiply: ["$textRelevance", 0.3] } // 30% weight for text match
            ]
          }
        }
      },
      {
        $sort: { hybridScore: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          name: 1,
          content: 1,
          timestamp: 1,
          vectorScore: 1,
          textRelevance: 1,
          hybridScore: 1
        }
      }
    ];
    
    const searchResults = await collection.aggregate(pipeline).toArray();
    
    await connection.close();
    
    res.json({
      query: query,
      results: searchResults,
      count: searchResults.length,
      searchType: "hybrid"
    });
    
  } catch (error) {
    console.error("Error performing hybrid search:", error);
    res.status(500).json({ 
      error: "Hybrid search failed", 
      message: error.message 
    });
  }
});

// Search with filters
router.get('/filtered-vector-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const documentName = req.query.name;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const limit = parseInt(req.query.limit) || 10;
    
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
    
    // Build filter object
    const filter = {};
    if (documentName) {
      filter.name = documentName;
    }
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) filter.timestamp.$lte = new Date(dateTo);
    }
    
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_search_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit,
          filter: Object.keys(filter).length > 0 ? filter : undefined
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          content: 1,
          timestamp: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];
    
    const searchResults = await collection.aggregate(pipeline).toArray();
    
    await connection.close();
    
    res.json({
      query: query,
      filters: filter,
      results: searchResults,
      count: searchResults.length,
      searchType: "filtered_vector"
    });
    
  } catch (error) {
    console.error("Error performing filtered vector search:", error);
    res.status(500).json({ 
      error: "Filtered vector search failed", 
      message: error.message 
    });
  }
});

module.exports = router;
