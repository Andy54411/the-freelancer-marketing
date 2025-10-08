#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building Lambda deployment package...');

// 1. Create lambda build directory
const buildDir = path.join(__dirname, 'lambda-build');
if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// 2. Copy necessary files
const filesToCopy = [
    'src/handler/lambda-ocr-handler.ts',
    'src/handler/lambda-file-download.ts',
    'package.json',
    'tsconfig.lambda.json'
];

filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(buildDir, file);
    
    // Create directory if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied: ${file}`);
    }
});

// 3. Create minimal package.json for Lambda
const lambdaPackageJson = {
    "name": "taskilo-ocr-lambda",
    "version": "1.0.0",
    "main": "dist/handler/lambda-ocr-handler.js",
    "dependencies": {
        "@aws-sdk/client-s3": "^3.600.0",
        "@google-cloud/storage": "^7.0.0",
        "axios": "^1.6.0",
        "zod": "^3.22.0"
    },
    "scripts": {
        "build": "tsc -p tsconfig.lambda.json",
        "deploy": "zip -r lambda-deployment.zip dist/ node_modules/ package.json"
    }
};

fs.writeFileSync(
    path.join(buildDir, 'package.json'), 
    JSON.stringify(lambdaPackageJson, null, 2)
);

console.log('✅ Lambda build structure created!');
console.log('\nNext steps:');
console.log('1. cd lambda-build');
console.log('2. npm install --production');
console.log('3. npx tsc');
console.log('4. npm run deploy');