/**
 * Basic Gemini API Test
 * 
 * This example tests which Gemini models are available with the current API key.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// API key from environment variable
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize the Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);

// Models to test
const models = [
  'gemini-pro',
  'gemini-pro-vision',
  'gemini-1.0-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'embedding-001',
  'gemini-2.0-flash',
  'gemini-2.5-pro-preview-03-25'
];

async function testModels() {
  console.log('Testing Gemini API Models:');
  console.log('==========================');
  
  for (const modelName of models) {
    try {
      console.log(`\nTesting model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello, this is a test message. Please respond with one short sentence.');
      console.log(`✅ Success! Response: "${result.response.text().substring(0, 60)}..."`);
    } catch (error) {
      console.error(`❌ Error with model ${modelName}: ${error.message}`);
    }
  }
  
  console.log('\n==========================');
  console.log('Model testing complete.');
}

// Run the test
testModels().catch(error => {
  console.error('Unexpected error:', error);
}); 