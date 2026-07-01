const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts text from a file buffer based on the file extension.
 * @param {Buffer} buffer - The file buffer in memory
 * @param {string} extension - File extension with leading dot (e.g. '.pdf', '.docx', '.txt')
 * @returns {Promise<string>} The extracted raw text contents
 */
async function extractTextFromBuffer(buffer, extension) {
  const ext = extension.toLowerCase();

  switch (ext) {
    case '.txt':
      return buffer.toString('utf8');
      
    case '.pdf':
      try {
        const data = await pdfParse(buffer);
        return data.text || '';
      } catch (error) {
        console.error('[Parser] PDF text extraction failed:', error);
        throw new Error('שגיאה בחילוץ טקסט מקובץ PDF');
      }

    case '.docx':
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
      } catch (error) {
        console.error('[Parser] DOCX text extraction failed:', error);
        throw new Error('שגיאה בחילוץ טקסט מקובץ Word');
      }

    default:
      throw new Error(`פורמט קובץ ${extension} אינו נתמך`);
  }
}

module.exports = {
  extractTextFromBuffer
};
