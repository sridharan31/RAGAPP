// Simple test to check document listing
const axios = require('axios');

async function testDocumentListing() {
  try {
    console.log('🧪 Testing document listing...\n');

    // Test if server is running
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running:', healthResponse.status === 200);

    // Test uploaded files endpoint
    const filesResponse = await axios.get('http://localhost:3000/uploaded-files');
    console.log('📁 Files response status:', filesResponse.status);
    console.log('📄 Files data:', JSON.stringify(filesResponse.data, null, 2));

    if (filesResponse.data && filesResponse.data.files) {
      console.log(`\n✅ Found ${filesResponse.data.files.length} files:`);
      filesResponse.data.files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.type}) - ${Math.round(file.size/1024)}KB`);
      });
    } else {
      console.log('❌ No files found or invalid response structure');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDocumentListing();