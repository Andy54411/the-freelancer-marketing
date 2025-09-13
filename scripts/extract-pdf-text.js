#!/usr/bin/env node
/*
  Simple PDF text extractor using pdf-parse.
  Usage:
    node scripts/extract-pdf-text.js <input.pdf> [output.txt]

  If output is omitted, the text is printed to stdout.
*/
const fs = require('fs');
const path = require('path');

async function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath) {
    console.error('Usage: node scripts/extract-pdf-text.js <input.pdf> [output.txt]');
    process.exit(1);
  }

  const absInput = path.resolve(inputPath);
  if (!fs.existsSync(absInput)) {
    console.error(`File not found: ${absInput}`);
    process.exit(1);
  }

  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (err) {
    console.error('Missing dependency "pdf-parse". Install with: pnpm add -D pdf-parse');
    process.exit(1);
  }

  try {
    const dataBuffer = fs.readFileSync(absInput);
    const data = await pdfParse(dataBuffer);
    const text = (data.text || '').trim();
    if (!text) {
      console.error(
        'No extractable text found. The PDF may be scanned or image-based. Consider OCR.'
      );
    }
    if (outputPath) {
      const absOut = path.resolve(outputPath);
      fs.writeFileSync(absOut, text, 'utf8');
      console.log(`Wrote text to ${absOut} (${text.length} chars)`);
    } else {
      process.stdout.write(text);
    }
  } catch (err) {
    console.error('Failed to parse PDF:', err.message);
    process.exit(1);
  }
}

main();
