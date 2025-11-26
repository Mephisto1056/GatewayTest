import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

/**
 * Reads a CSV file handling different encodings (UTF-8, GBK, etc.)
 * @param filePath Path to the CSV file
 * @returns Array of strings, one for each line
 */
export function readCsvContent(filePath: string): string[] {
  const buffer = fs.readFileSync(filePath);
  const detection = jschardet.detect(buffer);
  
  let encoding = detection.encoding || 'utf-8';
  
  // Normalized encoding names for iconv-lite
  if (encoding.toUpperCase() === 'GB2312') {
    encoding = 'GBK';
  }
  
  console.log(`Detected encoding for ${filePath}: ${encoding} (Confidence: ${detection.confidence})`);
  
  const content = iconv.decode(buffer, encoding);
  
  // Split by newline and handle different line endings
  return content.split(/\r?\n/);
}