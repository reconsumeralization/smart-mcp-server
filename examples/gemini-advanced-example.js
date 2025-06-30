/* eslint-disable no-console */
/**
 * Gemini 2.5 Advanced Features Example
 *
 * This example demonstrates advanced usage of the Gemini 2.5 model, including:
 * - Configuring the latest model
 * - Processing inline data (images) in responses
 * - Using tool/function calling capabilities
 * - Working with high token limits
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Configure model settings for Gemini 2.5
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-pro-preview-03-25',
});

// Advanced generation configuration
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 65536,
  responseModalities: [],
  responseMimeType: 'text/plain',
};

/**
 * Example 1: Basic chat with advanced configuration
 */
async function runBasicChatExample() {
  console.log('🚀 Running Basic Chat Example with Gemini 2.5...');

  // Start a chat session with the advanced configuration
  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  // Send a message to the model
  const result = await chatSession.sendMessage(
    'Explain the key differences between Gemini 1.5 and Gemini 2.5 models'
  );

  // Output the text response
  console.log('\n✨ Response:');
  console.log(result.response.text());

  return result.response;
}

/**
 * Example 2: Processing inline data from response
 */
async function runInlineDataExample() {
  console.log('\n🚀 Running Inline Data Example with Gemini 2.5...');

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'output');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('Error creating output directory:', err);
      return;
    }
  }

  // Create a model that can generate images
  const imageModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp-image-generation', // Use image generation model
  });

  // Generate image content
  const prompt =
    'Create a simple diagram showing the evolution of AI models from GPT to Gemini';
  console.log(`Prompt: "${prompt}"`);

  try {
    const result = await imageModel.generateContent(prompt);

    // Process response, including any inline data (images, etc.)
    const candidates = result.response.candidates;
    let imageCount = 0;

    for (
      let candidateIndex = 0;
      candidateIndex < candidates.length;
      candidateIndex++
    ) {
      for (
        let partIndex = 0;
        partIndex < candidates[candidateIndex].content.parts.length;
        partIndex++
      ) {
        const part = candidates[candidateIndex].content.parts[partIndex];

        // Handle inline data (like images) if present
        if (part.inlineData) {
          try {
            const extension = mime.extension(part.inlineData.mimeType) || 'bin';
            const filename = path.join(
              outputDir,
              `gemini_output_${candidateIndex}_${partIndex}.${extension}`
            );
            await fs.writeFile(
              filename,
              Buffer.from(part.inlineData.data, 'base64')
            );
            console.log(`✅ Image written to: ${filename}`);
            imageCount++;
          } catch (err) {
            console.error('❌ Error writing inline data:', err);
          }
        } else if (part.text) {
          console.log('\n✨ Text content:');
          console.log(part.text);
        }
      }
    }

    if (imageCount === 0) {
      console.log('⚠️ No images were generated in the response');
    }
  } catch (error) {
    console.error('❌ Error generating content:', error);
  }
}

/**
 * Example 3: Tool/Function calling
 */
async function runToolCallingExample() {
  console.log('\n🚀 Running Tool Calling Example with Gemini 2.5...');

  // Define our weather tool
  const weatherTool = {
    functionDeclarations: [
      {
        name: 'get_weather',
        description: 'Get current weather in a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: "City and country (e.g., 'London, UK')",
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              description: 'Temperature unit',
            },
          },
          required: ['location'],
        },
      },
    ],
  };

  // Define our calculator tool
  const calculatorTool = {
    functionDeclarations: [
      {
        name: 'calculate',
        description: 'Perform a mathematical calculation',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'The mathematical expression to evaluate',
            },
          },
          required: ['expression'],
        },
      },
    ],
  };

  // Initialize model with tools
  const toolModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro-preview-03-25',
    tools: [weatherTool, calculatorTool],
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
    },
  });

  const chat = toolModel.startChat();

  // Sample prompt that should trigger tool usage
  const prompt =
    "I'm planning a trip to Tokyo next week. What's the weather like there? Also, if I have a budget of $1500 for a 5-day trip, how much can I spend per day?";
  console.log(`Prompt: "${prompt}"`);

  const result = await chat.sendMessage(prompt);

  // Check if there's a function call in the response
  if (
    result.response.candidates &&
    result.response.candidates[0].content &&
    result.response.candidates[0].content.parts &&
    result.response.candidates[0].content.parts[0].functionCall
  ) {
    const functionCall =
      result.response.candidates[0].content.parts[0].functionCall;
    console.log('\n🛠️ Function called:', functionCall.name);
    console.log('Arguments:', JSON.stringify(functionCall.args, null, 2));

    // Simulate function response based on which function was called
    let functionResponse;

    if (functionCall.name === 'get_weather') {
      // Simulate weather data
      functionResponse = {
        location: functionCall.args.location || 'Tokyo, Japan',
        temperature: 24,
        condition: 'Partly cloudy',
        humidity: 65,
        wind: '10 km/h',
        unit: functionCall.args.unit || 'celsius',
      };
    } else if (functionCall.name === 'calculate') {
      // Safely evaluate the expression
      try {
        const expression = functionCall.args.expression;
        // Very simple calculator - in production you'd use a safer method
        const result = eval(expression);
        functionResponse = {
          expression: expression,
          result: result,
        };
      } catch (error) {
        functionResponse = {
          error: `Invalid expression: ${error.message}`,
        };
      }
    }

    console.log(
      'Function response:',
      JSON.stringify(functionResponse, null, 2)
    );

    // Send function response back to continue the conversation
    const followUpResult = await chat.sendMessage({
      functionResponse: {
        name: functionCall.name,
        response: { result: functionResponse },
      },
    });

    // Display final response
    console.log('\n✨ Final response:');
    console.log(followUpResult.response.text());

    // Continue conversation to use additional tools
    const secondFollowUp = await chat.sendMessage(
      'Could you also calculate how much that would be in Japanese yen, if the exchange rate is 1 USD = 155 JPY?'
    );

    console.log('\n💬 Follow-up response:');
    console.log(secondFollowUp.response.text());
  } else {
    // Direct response without function calling
    console.log('\n✨ Direct response:');
    console.log(result.response.text());
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    console.log('=========================================');
    console.log('🌟 Gemini 2.5 Advanced Features Examples');
    console.log('=========================================\n');

    await runBasicChatExample();
    await runInlineDataExample();
    await runToolCallingExample();

    console.log('\n=========================================');
    console.log('✅ All examples completed successfully');
    console.log('=========================================');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

runAllExamples();
