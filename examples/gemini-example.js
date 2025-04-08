/**
 * Gemini API Examples
 * 
 * This file demonstrates using the Gemini API through our client wrapper.
 */

import geminiClient, { GeminiClient } from '../lib/gemini-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Example 1: Simple text generation
 */
async function generateTextExample() {
  // Generate a simple text completion
  const prompt = "What are three major benefits of using AI for communication protocols?";
  
  console.log(`\n=== Example 1: Text Generation ===`);
  console.log(`Prompt: ${prompt}`);
  
  try {
    const result = await geminiClient.generateText(prompt);
    console.log(`\nResponse:\n${result.text}`);
  } catch (error) {
    console.error('Error generating text:', error.message);
  }
}

/**
 * Example 2: Chat conversation
 */
async function chatExample() {
  console.log(`\n=== Example 2: Chat Conversation ===`);
  
  try {
    // Create a chat session
    const chat = geminiClient.createChat();
    
    // First message
    console.log(`User: Hello, I'd like to learn about Model Context Protocols.`);
    const response1 = await geminiClient.sendChatMessage(
      chat, 
      "Hello, I'd like to learn about Model Context Protocols."
    );
    console.log(`Gemini: ${response1.text}`);
    
    // Follow-up question
    console.log(`\nUser: What are the key components of a Model Context Protocol?`);
    const response2 = await geminiClient.sendChatMessage(
      chat, 
      "What are the key components of a Model Context Protocol?"
    );
    console.log(`Gemini: ${response2.text}`);
    
    // Another follow-up
    console.log(`\nUser: Can you provide an example of how they're implemented?`);
    const response3 = await geminiClient.sendChatMessage(
      chat, 
      "Can you provide an example of how they're implemented?"
    );
    console.log(`Gemini: ${response3.text}`);
  } catch (error) {
    console.error('Error in chat conversation:', error.message);
  }
}

/**
 * Example 3: Image input
 */
async function imageInputExample() {
  console.log(`\n=== Example 3: Image Input ===`);
  
  // Example image path (adjust as needed)
  const imagePath = path.join(__dirname, '..', 'test', 'fixtures', 'test-image.jpg');
  
  if (!fs.existsSync(imagePath)) {
    console.log(`Note: Image example skipped. Place a test image at: ${imagePath}`);
    return;
  }
  
  try {
    const prompt = "What's in this image? Provide a detailed description.";
    console.log(`Prompt with image: ${prompt}`);
    
    const result = await geminiClient.generateWithImages(prompt, [imagePath]);
    console.log(`\nResponse:\n${result.text}`);
  } catch (error) {
    console.error('Error with image input:', error.message);
  }
}

/**
 * Example 4: Custom configuration
 */
async function customConfigExample() {
  console.log(`\n=== Example 4: Custom Configuration ===`);
  
  try {
    // Create a custom client with different parameters
    const customClient = new GeminiClient({
      model: "gemini-2.5-pro-preview-03-25",
      temperature: 0.2,
      maxTokens: 150
    });
    
    // Generate text with the custom client
    const prompt = "Generate a brief, structured protocol for integrating a database with an AI model.";
    console.log(`Prompt with low temperature: ${prompt}`);
    
    const result = await customClient.generateText(prompt);
    console.log(`\nResponse (more focused due to low temperature):\n${result.text}`);
  } catch (error) {
    console.error('Error with custom configuration:', error.message);
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('[' + new Date().toISOString() + '] Starting Gemini API examples...');
  
  try {
    // Check if API key is valid
    const isValid = await geminiClient.validateApiKey();
    if (!isValid) {
      throw new Error('Invalid or missing Gemini API key. Set GEMINI_API_KEY environment variable.');
    }
    
    await generateTextExample();
    await chatExample();
    await imageInputExample();
    await customConfigExample();
    
    console.log('\n[' + new Date().toISOString() + '] All examples completed successfully!');
  } catch (error) {
    console.error('[' + new Date().toISOString() + '] Error running examples:', error);
  }
}

// Run the examples
runExamples(); 