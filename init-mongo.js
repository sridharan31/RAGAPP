// MongoDB initialization script
// This script runs when the container starts for the first time

// Switch to the rag_doc database
db = db.getSiblingDB('rag_doc');

// Create a user for the application
db.createUser({
  user: 'ragapp',
  pwd: 'ragapp123',
  roles: [
    {
      role: 'readWrite',
      db: 'rag_doc'
    }
  ]
});

// Create the documents collection and insert a sample document
db.createCollection('documents');
db.documents.insertOne({
  name: 'sample_document',
  content: 'This is a sample document for RAG application',
  embedding: [],
  timestamp: new Date()
});

print('Database initialized successfully');
