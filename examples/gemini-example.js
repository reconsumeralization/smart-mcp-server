/**
 * Gemini API Integration Example
 * 
 * This script demonstrates how to use the Gemini API integration
 * for text generation, chat, and other capabilities.
 */

import geminiClient from '../lib/gemini-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Utility to log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a text generation example
 */
async function textGenerationExample() {
  log('EXAMPLE: Text Generation');
  
  try {
    const prompt = 'Explain the core principles of the Bauhaus design movement in 3 paragraphs.';
    log(`Prompt: ${prompt}`);
    
    const result = await geminiClient.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 500
    });
    
    log('Generated Text:');
    console.log('-'.repeat(80));
    console.log(result.text);
    console.log('-'.repeat(80));
    
    log('Generation completed successfully');
  } catch (error) {
    log(`Error in text generation: ${error.message}`);
  }
}

/**
 * Run a chat example
 */
async function chatExample() {
  log('EXAMPLE: Chat Conversation');
  
  try {
    // Start a new chat
    const chat = geminiClient.createChat({
      history: [] // Start with an empty history
    });
    
    // First message
    log('USER: Tell me about Model Context Protocol');
    
    let response = await chat.sendMessage('Tell me about Model Context Protocol');
    
    log('MODEL:');
    console.log('-'.repeat(80));
    console.log(response.text());
    console.log('-'.repeat(80));
    
    // Wait a bit
    await sleep(1000);
    
    // Second message
    log('USER: How is it related to AI assistants?');
    
    response = await chat.sendMessage('How is it related to AI assistants?');
    
    log('MODEL:');
    console.log('-'.repeat(80));
    console.log(response.text());
    console.log('-'.repeat(80));
    
    // Wait a bit
    await sleep(1000);
    
    // Third message
    log('USER: What are the main components of the protocol?');
    
    response = await chat.sendMessage('What are the main components of the protocol?');
    
    log('MODEL:');
    console.log('-'.repeat(80));
    console.log(response.text());
    console.log('-'.repeat(80));
    
    log('Chat completed successfully');
  } catch (error) {
    log(`Error in chat: ${error.message}`);
  }
}

/**
 * Run an embedding example
 */
async function embeddingExample() {
  log('EXAMPLE: Text Embedding');
  
  try {
    const text = 'The Model Context Protocol defines standards for AI model integration';
    log(`Text to embed: ${text}`);
    
    const embedding = await geminiClient.generateEmbedding(text);
    
    log(`Generated embedding with ${embedding.length} dimensions`);
    log(`First 5 values: ${embedding.slice(0, 5).join(', ')}...`);
    
    log('Embedding completed successfully');
  } catch (error) {
    log(`Error in embedding: ${error.message}`);
  }
}

/**
 * Main function to run examples
 */
async function runExamples() {
  log('Starting Gemini API examples...');
  
  try {
    // Validate API key first
    log('Validating API key...');
    const isValid = await geminiClient.validateApiKey();
    
    if (!isValid) {
      log('ERROR: Invalid API key. Please check your .env file and set a valid GEMINI_API_KEY.');
      return;
    }
    
    log('API key is valid. Running examples...');
    
    // Run text generation example
    await textGenerationExample();
    console.log('\n');
    
    // Run chat example
    await chatExample();
    console.log('\n');
    
    // Run embedding example
    await embeddingExample();
    
    log('All examples completed.');
  } catch (error) {
    log(`Error running examples: ${error.message}`);
  }
}

// Run the examples
runExamples().catch(error => {
  log(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 