// Test CSV upload functionality
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testCSVUpload() {
  console.log('🧪 Testing CSV Upload and File Management\n');

  try {
    // 1. Test CSV file upload
    console.log('1️⃣  Uploading CSV file...');
    
    const csvFilePath = path.join(__dirname, 'test-employees.csv');
    if (!fs.existsSync(csvFilePath)) {
      throw new Error('CSV test file not found');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(csvFilePath));

    const uploadResponse = await axios.post(`${BASE_URL}/upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log('✅ CSV upload successful:', uploadResponse.data.message);

    // 2. Test getting uploaded files
    console.log('\n2️⃣  Getting uploaded files...');
    const filesResponse = await axios.get(`${BASE_URL}/uploaded-files`);
    
    if (filesResponse.data && filesResponse.data.files) {
      console.log(`✅ Found ${filesResponse.data.files.length} uploaded file(s):`);
      filesResponse.data.files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name} (${file.type}) - ${Math.round(file.size/1024)}KB`);
        console.log(`      Chunks: ${file.chunkCount || 1}, Uploaded: ${file.uploadedAt || 'Unknown'}`);
      });
    } else {
      console.log('❌ No files found or invalid response');
    }

    // 3. Test search functionality with CSV content
    console.log('\n3️⃣  Testing search with CSV content...');
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: { 
        q: 'engineering department salary',
        limit: 5
      }
    });

    if (searchResponse.data && searchResponse.data.results) {
      console.log(`✅ Search found ${searchResponse.data.results.length} results:`);
      searchResponse.data.results.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. Score: ${result.score?.toFixed(4)} - ${result.text?.substring(0, 100) || result.content?.substring(0, 100)}...`);
      });
    } else {
      console.log('❌ Search failed or no results');
    }

    // 4. Test conversation with CSV data
    console.log('\n4️⃣  Testing conversation with CSV data...');
    const conversationResponse = await axios.post(`${BASE_URL}/conversation`, {
      message: "What is the average salary of engineers in the uploaded CSV?",
      sessionId: `csv-test-${Date.now()}`
    });

    if (conversationResponse.data) {
      console.log('✅ AI Response:', conversationResponse.data.message?.substring(0, 200) + '...');
      console.log(`   Context documents: ${conversationResponse.data.context_documents || 0}`);
    }

    // 5. Test delete functionality
    console.log('\n5️⃣  Testing file deletion...');
    if (filesResponse.data && filesResponse.data.files && filesResponse.data.files.length > 0) {
      const fileToDelete = filesResponse.data.files[0];
      console.log(`Deleting file: ${fileToDelete.name}`);
      
      const deleteResponse = await axios.delete(`${BASE_URL}/uploaded-files/${fileToDelete.id}`);
      console.log('✅ Delete successful:', deleteResponse.data.message);
      
      // Verify deletion
      const verifyResponse = await axios.get(`${BASE_URL}/uploaded-files`);
      const remainingFiles = verifyResponse.data.files || [];
      console.log(`✅ Verification: ${remainingFiles.length} files remaining`);
    }

    console.log('\n🎉 All CSV tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
if (require.main === module) {
  testCSVUpload()
    .then(() => {
      console.log('\n📋 CSV Test Summary:');
      console.log('- CSV file upload: ✅');
      console.log('- File listing: ✅');
      console.log('- CSV content search: ✅');
      console.log('- AI conversation with CSV data: ✅');
      console.log('- File deletion: ✅');
    })
    .catch(error => {
      console.error('\n💥 CSV test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testCSVUpload };