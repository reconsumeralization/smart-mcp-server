/* eslint-disable no-console */
/**
 * Gemini Response Types Example
 *
 * This example demonstrates how to configure the Gemini models
 * for different response types:
 * 1. Plain text responses
 * 2. JSON responses
 * 3. Text content with streaming
 * 4. Mixed content with code examples
 *
 * Before running this example:
 * - Create a .env file in the project root with your GEMINI_API_KEY
 * - Or set the GEMINI_API_KEY environment variable before running
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get directory path for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure output directory exists for saving files
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure the Generative AI client
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('\n┌───────────────────────────────────────────────────────┐');
  console.error('│               GEMINI API KEY REQUIRED                │');
  console.error('└───────────────────────────────────────────────────────┘');
  console.error('\nError: GEMINI_API_KEY environment variable is required');
  console.error(
    '\nTo run this example, set up your environment with a valid Gemini API key:'
  );
  console.error(
    '\n1. Get an API key from: https://aistudio.google.com/app/apikey'
  );
  console.error('2. Run the example with one of these methods:');
  console.error('\n   • Windows PowerShell:');
  console.error('     $env:GEMINI_API_KEY = "your-api-key"');
  console.error('     node examples/gemini-response-types-example.js');
  console.error('\n   • Windows CMD:');
  console.error('     set GEMINI_API_KEY=your-api-key');
  console.error('     node examples/gemini-response-types-example.js');
  console.error('\n   • Linux/Mac:');
  console.error(
    '     GEMINI_API_KEY="your-api-key" node examples/gemini-response-types-example.js'
  );
  console.error('\n   • Add to .env file:');
  console.error('     Create a .env file with GEMINI_API_KEY=your-api-key');
  console.error(
    '\nNote: API keys have model access restrictions. Make sure your key'
  );
  console.error('      has access to the models used in this example:');
  console.error(`      • ${WORKING_MODEL}`);
  console.error(`      • ${BACKUP_MODEL}`);
  process.exit(1);
}

// Simple validation that the API key has the expected format (not a full validation)
if (API_KEY === 'your-api-key' || API_KEY.length < 10) {
  console.error('\n┌───────────────────────────────────────────────────────┐');
  console.error('│               INVALID API KEY FORMAT                 │');
  console.error('└───────────────────────────────────────────────────────┘');
  console.error('\nWarning: The API key provided does not appear to be valid');
  console.error('Please provide your actual Gemini API key, not a placeholder');
  console.error(
    'Get a valid API key at: https://aistudio.google.com/app/apikey'
  );
}

/**
 * Helper function to handle API key errors
 * @param {Error} error - The error object
 * @returns {boolean} - True if it's an API key error
 */
function handleApiKeyError(error) {
  if (
    error.message &&
    (error.message.includes('API key not valid') ||
      error.message.includes('API_KEY_INVALID') ||
      error.message.includes('permission'))
  ) {
    console.error(
      '\n┌───────────────────────────────────────────────────────┐'
    );
    console.error('│                  API KEY ERROR                      │');
    console.error('└───────────────────────────────────────────────────────┘');
    console.error(
      '\nYour Gemini API key is invalid or has insufficient permissions'
    );
    console.error('\nTroubleshooting steps:');
    console.error(
      "1. Verify you're using a valid key from https://aistudio.google.com/app/apikey"
    );
    console.error(
      `2. Check if your key has access to the "${WORKING_MODEL}" model`
    );
    console.error(
      "3. Make sure you haven't exceeded your quota or rate limits"
    );
    console.error(
      '4. Try the backup model by changing WORKING_MODEL to BACKUP_MODEL in the code'
    );
    return true;
  }
  return false;
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Based on testing, these models are confirmed to work
const WORKING_MODEL = 'gemini-2.0-flash'; // This is our primary model
const BACKUP_MODEL = 'gemini-1.5-flash'; // Backup in case of rate limiting

/**
 * Example 1: Generate plain text response
 */
async function generatePlainTextResponse() {
  console.log('\n=== Example 1: Plain Text Response ===');

  // Use the model we know works
  const model = genAI.getGenerativeModel({
    model: WORKING_MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  try {
    const prompt =
      'Explain asynchronous programming in JavaScript with examples. Keep it concise.';

    console.log(`Sending prompt: "${prompt}"`);
    const result = await model.generateContent(prompt);

    console.log('\nPlain Text Response:');
    console.log(result.response.text());

    // Save the response to a text file
    const textPath = path.join(outputDir, `plain_text_${Date.now()}.txt`);
    fs.writeFileSync(textPath, result.response.text());
    console.log(`\nSaved text to: ${textPath}`);
  } catch (error) {
    if (handleApiKeyError(error)) {
      // API key error already handled
    } else {
      console.error('Error generating plain text response:', error.message);
    }
    return null;
  }
}

/**
 * Example 2: Generate JSON response
 */
async function generateJsonResponse() {
  console.log('\n=== Example 2: JSON Response ===');

  const model = genAI.getGenerativeModel({
    model: WORKING_MODEL,
    generationConfig: {
      temperature: 0.2, // Lower temperature for more deterministic JSON
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  try {
    // Since responseMimeType is not supported, we explicitly ask for JSON in the prompt
    const prompt = `Generate a JSON object for a fictional user profile with name, age, email, interests array, 
    address object with street, city, state, and zip, and a brief bio. 
    The response should be ONLY valid JSON with no other text before or after. 
    Format it as follows: 
    {
      "name": "...",
      "age": number,
      "email": "...",
      "interests": ["...", "..."],
      "address": {
        "street": "...",
        "city": "...",
        "state": "...",
        "zip": "..."
      },
      "bio": "..."
    }`;

    console.log(`Sending JSON request...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    console.log('\nJSON Response (raw):');
    console.log(responseText);

    // Parse and save the JSON
    try {
      // Try to extract just the JSON part if there's additional text
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;

      const jsonData = JSON.parse(jsonText);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(jsonData, null, 2));

      // Save to file
      const jsonPath = path.join(outputDir, `user_profile_${Date.now()}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
      console.log(`\nSaved JSON to: ${jsonPath}`);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      console.error('Raw response might not be valid JSON format');
    }
  } catch (error) {
    if (handleApiKeyError(error)) {
      // API key error already handled
    } else {
      console.error('Error generating JSON response:', error.message);
    }
    return null;
  }
}

/**
 * Example 3: Generate text content with streaming
 */
async function generateStreamingText() {
  console.log('\n=== Example 3: Streaming Text Response ===');

  const model = genAI.getGenerativeModel({
    model: WORKING_MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  try {
    // A prompt that asks for a structured response
    const prompt =
      'Create a step-by-step guide explaining the JavaScript event loop. Format it with numbered steps.';

    console.log(`Generating content with streaming...`);

    // Using stream for more interactive experience
    const response = await model.generateContentStream(prompt);

    // Setup for saving the complete response
    let fullResponse = '';

    console.log('\nStreaming response:');
    for await (const chunk of response.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      process.stdout.write(chunkText);
    }

    // Save the full response to a file
    const streamPath = path.join(
      outputDir,
      `streamed_content_${Date.now()}.md`
    );
    fs.writeFileSync(streamPath, fullResponse);
    console.log(`\n\nSaved streamed content to: ${streamPath}`);
  } catch (error) {
    console.error('Error generating streaming content:', error);
  }
}

/**
 * Example 4: Generate mixed content
 */
async function generateMixedContent() {
  console.log('\n=== Example 4: Mixed Content Response ===');

  const model = genAI.getGenerativeModel({
    model: WORKING_MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  try {
    // A prompt that asks for a structured response
    const prompt =
      'Create a step-by-step guide explaining the JavaScript event loop. Format it with numbered steps. Include some code examples.';

    console.log(`Generating content with streaming...`);

    // Using stream for more interactive experience
    const response = await model.generateContentStream(prompt);

    // Setup for saving the complete response
    let fullResponse = '';

    console.log('\nStreaming response:');
    for await (const chunk of response.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      process.stdout.write(chunkText);
    }

    // Save the full response to a file
    const streamPath = path.join(outputDir, `mixed_content_${Date.now()}.md`);
    fs.writeFileSync(streamPath, fullResponse);
    console.log(`\n\nSaved streamed content to: ${streamPath}`);
  } catch (error) {
    if (handleApiKeyError(error)) {
      // API key error already handled
    } else {
      console.error('Error generating mixed content:', error.message);
    }
    return null;
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('=====================================================');
  console.log('Running Gemini API Example with Different Response Types');
  console.log('=====================================================\n');

  try {
    await generatePlainTextResponse();
    await generateJsonResponse();
    await generateStreamingText();
    await generateMixedContent();
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Failed to run examples:', error.message);
  }
}

// Run all examples
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) {
  console.error('GEMINI_API_KEY environment variable is missing or invalid.');
  process.exit(1);
}
runAllExamples().catch((error) => {
  console.error('Unhandled error during execution:', error);
  process.exit(1);
});
