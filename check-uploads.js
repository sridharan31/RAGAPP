// Quick test to check files
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');

console.log('📁 Checking uploads directory:', uploadsDir);

if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files:`);
  
  files.forEach((file, index) => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    console.log(`${index + 1}. ${file} - ${Math.round(stats.size/1024)}KB`);
  });
} else {
  console.log('❌ Uploads directory does not exist');
}