// services/documentProcessor.js
const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json");
// Optional dependencies - will be loaded if available
let mammoth = null;
let officeParser = null;

try {
  mammoth = require('mammoth');
} catch (e) {
  console.warn('mammoth not installed - DOCX support disabled');
}

try {
  officeParser = require('officeparser');
} catch (e) {
  console.warn('officeparser not installed - Office file support disabled');
}

// Import AI providers with fallback
let getActiveProvider = () => 'google';
let generateAIResponse = async () => null;

try {
  const aiProviders = require('../routes/ai-providers');
  getActiveProvider = aiProviders.getActiveProvider;
  generateAIResponse = aiProviders.generateAIResponse;
} catch (e) {
  console.warn('AI providers not available - using basic processing');
}

class DocumentProcessor {
  constructor() {
    // Base formats always supported
    this.supportedFormats = {
      'application/pdf': {
        extension: '.pdf',
        processor: 'processPDF',
        description: 'PDF Document'
      },
      'text/plain': {
        extension: '.txt',
        processor: 'processTXT',
        description: 'Plain Text File'
      },
      'text/markdown': {
        extension: '.md',
        processor: 'processTXT',
        description: 'Markdown File'
      },
      'text/csv': {
        extension: '.csv',
        processor: 'processCSV',
        description: 'CSV Spreadsheet'
      },
      'application/csv': {
        extension: '.csv',
        processor: 'processCSV',
        description: 'CSV Spreadsheet'
      }
    };

    // Add DOCX support if mammoth is available
    if (mammoth) {
      this.supportedFormats['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = {
        extension: '.docx',
        processor: 'processDOCX',
        description: 'Microsoft Word Document'
      };
    }

    // Add Office formats if officeParser is available
    if (officeParser) {
      this.supportedFormats['application/msword'] = {
        extension: '.doc',
        processor: 'processDOC',
        description: 'Microsoft Word Document (Legacy)'
      };
      this.supportedFormats['application/vnd.openxmlformats-officedocument.presentationml.presentation'] = {
        extension: '.pptx',
        processor: 'processPPTX',
        description: 'Microsoft PowerPoint Presentation'
      };
      this.supportedFormats['application/vnd.ms-powerpoint'] = {
        extension: '.ppt',
        processor: 'processPPT',
        description: 'Microsoft PowerPoint Presentation (Legacy)'
      };
      this.supportedFormats['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = {
        extension: '.xlsx',
        processor: 'processXLSX',
        description: 'Microsoft Excel Spreadsheet'
      };
      this.supportedFormats['application/vnd.ms-excel'] = {
        extension: '.xls',
        processor: 'processXLS',
        description: 'Microsoft Excel Spreadsheet (Legacy)'
      };
    }
  }

  // Get supported file formats
  getSupportedFormats() {
    return Object.keys(this.supportedFormats).map(mimeType => ({
      mimeType,
      ...this.supportedFormats[mimeType]
    }));
  }

  // Check if file format is supported
  isFormatSupported(mimeType) {
    return this.supportedFormats.hasOwnProperty(mimeType);
  }

  // Get file format info
  getFormatInfo(mimeType) {
    return this.supportedFormats[mimeType] || null;
  }

  // Main processing function
  async processDocument(filePath, filename, mimeType) {
    if (!this.isFormatSupported(mimeType)) {
      throw new Error(`Unsupported file format: ${mimeType}`);
    }

    const formatInfo = this.getFormatInfo(mimeType);
    const processorMethod = this[formatInfo.processor];
    
    if (!processorMethod) {
      throw new Error(`Processor method ${formatInfo.processor} not found`);
    }

    console.log(`Processing ${formatInfo.description}: ${filename}`);
    return await processorMethod.call(this, filePath, filename);
  }

  // PDF processor (existing logic)
  async processPDF(filePath, filename) {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      
      pdfParser.on("pdfParser_dataReady", (data) => {
        try {
          const rawText = pdfParser.getRawTextContent();
          resolve({
            text: rawText,
            metadata: {
              pageCount: data.Pages?.length || 0,
              title: data.Meta?.Title || filename,
              author: data.Meta?.Author || 'Unknown',
              creator: data.Meta?.Creator || 'Unknown'
            }
          });
        } catch (error) {
          reject(error);
        }
      });
      
      pdfParser.on("pdfParser_dataError", (errData) => {
        reject(new Error(errData.parserError || 'Failed to parse PDF'));
      });
      
      pdfParser.loadPDF(filePath);
    });
  }

  // DOCX processor
  async processDOCX(filePath, filename) {
    if (!mammoth) {
      throw new Error('DOCX support not available - mammoth package not installed');
    }
    
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return {
        text: result.value,
        metadata: {
          wordCount: result.value.split(/\s+/).length,
          title: filename,
          warnings: result.messages
        }
      };
    } catch (error) {
      throw new Error(`Failed to process DOCX file: ${error.message}`);
    }
  }

  // DOC processor (legacy format)
  async processDOC(filePath, filename) {
    if (!officeParser) {
      throw new Error('DOC support not available - officeparser package not installed');
    }
    
    try {
      const data = await officeParser.parseOffice(filePath);
      return {
        text: data,
        metadata: {
          title: filename,
          format: 'Legacy Word Document'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process DOC file: ${error.message}`);
    }
  }

  // TXT processor
  async processTXT(filePath, filename) {
    try {
      const text = await fs.promises.readFile(filePath, 'utf-8');
      return {
        text: text,
        metadata: {
          lineCount: text.split('\n').length,
          wordCount: text.split(/\s+/).length,
          title: filename
        }
      };
    } catch (error) {
      throw new Error(`Failed to process text file: ${error.message}`);
    }
  }

  // CSV processor
  async processCSV(filePath, filename) {
    try {
      const csvData = await fs.promises.readFile(filePath, 'utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse CSV headers
      const headers = this.parseCSVLine(lines[0]);
      const rows = [];
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length > 0) {
          const row = {};
          values.forEach((value, index) => {
            const header = headers[index] || `Column_${index + 1}`;
            row[header] = value;
          });
          rows.push(row);
        }
      }

      // Convert CSV to readable text format
      let text = `CSV Data from ${filename}\n\n`;
      text += `Headers: ${headers.join(', ')}\n\n`;
      text += `Data Summary:\n`;
      text += `- Total rows: ${rows.length}\n`;
      text += `- Columns: ${headers.length}\n\n`;

      // Add sample data (first 10 rows)
      text += `Sample Data:\n`;
      rows.slice(0, 10).forEach((row, index) => {
        text += `Row ${index + 1}:\n`;
        Object.entries(row).forEach(([key, value]) => {
          text += `  ${key}: ${value}\n`;
        });
        text += '\n';
      });

      if (rows.length > 10) {
        text += `... and ${rows.length - 10} more rows\n`;
      }

      return {
        text: text,
        metadata: {
          rowCount: rows.length,
          columnCount: headers.length,
          headers: headers,
          title: filename,
          format: 'CSV Spreadsheet'
        },
        structuredData: rows // Include structured data for advanced processing
      };
    } catch (error) {
      throw new Error(`Failed to process CSV file: ${error.message}`);
    }
  }

  // Helper method to parse CSV line handling quotes
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.filter(item => item !== '');
  }

  // XLSX processor (using officeparser if available)
  async processXLSX(filePath, filename) {
    if (!officeParser) {
      // Fallback: try to read as text and parse basic structure
      try {
        return await this.processSpreadsheetFallback(filePath, filename, 'XLSX');
      } catch (error) {
        throw new Error('XLSX support not available - officeparser package not installed and fallback failed');
      }
    }
    
    try {
      const data = await officeParser.parseOffice(filePath);
      return {
        text: data,
        metadata: {
          title: filename,
          format: 'Excel Spreadsheet'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process XLSX file: ${error.message}`);
    }
  }

  // XLS processor
  async processXLS(filePath, filename) {
    if (!officeParser) {
      throw new Error('XLS support not available - officeparser package not installed');
    }
    
    try {
      const data = await officeParser.parseOffice(filePath);
      return {
        text: data,
        metadata: {
          title: filename,
          format: 'Excel Spreadsheet (Legacy)'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process XLS file: ${error.message}`);
    }
  }

  // Fallback processor for spreadsheets when proper parsers aren't available
  async processSpreadsheetFallback(filePath, filename, format) {
    return {
      text: `Spreadsheet file: ${filename}\n\nThis ${format} file was uploaded but could not be fully processed due to missing dependencies. The file has been stored and can be referenced in conversations.`,
      metadata: {
        title: filename,
        format: `${format} Spreadsheet (Limited Processing)`,
        note: 'Install additional packages for full spreadsheet processing'
      }
    };
  }

  // PPTX processor
  async processPPTX(filePath, filename) {
    if (!officeParser) {
      throw new Error('PPTX support not available - officeparser package not installed');
    }
    
    try {
      const data = await officeParser.parseOffice(filePath);
      return {
        text: data,
        metadata: {
          title: filename,
          format: 'PowerPoint Presentation'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process PPTX file: ${error.message}`);
    }
  }

  // PPT processor (legacy format)
  async processPPT(filePath, filename) {
    if (!officeParser) {
      throw new Error('PPT support not available - officeparser package not installed');
    }
    
    try {
      const data = await officeParser.parseOffice(filePath);
      return {
        text: data,
        metadata: {
          title: filename,
          format: 'Legacy PowerPoint Presentation'
        }
      };
    } catch (error) {
      throw new Error(`Failed to process PPT file: ${error.message}`);
    }
  }

  // Enhanced text chunking with AI provider awareness
  async intelligentChunking(text, filename) {
    const activeProvider = getActiveProvider();
    
    // Basic chunking by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // If we have an AI provider available, use it for intelligent chunking
    if (activeProvider && paragraphs.length > 10) {
      try {
        const prompt = `Please analyze this text and suggest optimal chunking points for semantic search. Text: "${text.substring(0, 2000)}..."`;
        const aiSuggestion = await generateAIResponse(prompt, '');
        
        // For now, fall back to paragraph-based chunking
        // In a production system, you'd parse the AI response for chunk boundaries
        console.log('AI chunking suggestion received for:', filename);
      } catch (error) {
        console.warn('AI chunking failed, using default method:', error.message);
      }
    }

    // Smart chunking based on content structure
    const chunks = [];
    let currentChunk = '';
    const maxChunkSize = 1500; // Characters
    const minChunkSize = 200;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > minChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
  }

  // Generate document summary using AI
  async generateDocumentSummary(text, filename, mimeType) {
    try {
      const activeProvider = getActiveProvider();
      if (!activeProvider) {
        return null;
      }

      const formatInfo = this.getFormatInfo(mimeType);
      const prompt = `Please provide a brief summary (2-3 sentences) of this ${formatInfo.description} document: "${text.substring(0, 1000)}..."`;
      
      const summary = await generateAIResponse(prompt, '');
      return summary;
    } catch (error) {
      console.warn('Failed to generate AI summary:', error.message);
      return null;
    }
  }

  // Extract keywords using AI
  async extractKeywords(text, filename) {
    try {
      const activeProvider = getActiveProvider();
      if (!activeProvider) {
        return [];
      }

      const prompt = `Extract 5-10 key topics/keywords from this document content: "${text.substring(0, 1500)}..."`;
      const keywordsText = await generateAIResponse(prompt, '');
      
      // Parse keywords from AI response (simple parsing)
      const keywords = keywordsText
        .split(/[,\n]/)
        .map(k => k.trim())
        .filter(k => k.length > 2 && k.length < 50)
        .slice(0, 10);

      return keywords;
    } catch (error) {
      console.warn('Failed to extract keywords:', error.message);
      return [];
    }
  }
}

module.exports = DocumentProcessor;