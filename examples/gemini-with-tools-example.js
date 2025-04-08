/**
 * Gemini with Tools Example
 * 
 * This example demonstrates how to use Gemini with tool calling capabilities.
 * The script shows how Gemini can use other registered tools to complete tasks.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const GEMINI_SERVER_URL = `http://localhost:${process.env.GEMINI_SERVER_PORT || 3006}`;

// Example tools to register with Gemini
const EXAMPLE_TOOLS = [
  {
    toolId: 'weather_tool',
    toolInfo: {
      name: 'weather_tool',
      description: 'Get the current weather for a location',
      functions: [
        {
          name: 'get_weather',
          description: 'Get the current weather for a location',
          parameters: {
            type: 'object',
            required: ['location'],
            properties: {
              location: {
                type: 'string',
                description: 'The city and country, e.g. "London, UK"'
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The unit of temperature'
              }
            }
          }
        }
      ]
    }
  },
  {
    toolId: 'calculator_tool',
    toolInfo: {
      name: 'calculator_tool',
      description: 'Perform mathematical calculations',
      functions: [
        {
          name: 'calculate',
          description: 'Calculate a mathematical expression',
          parameters: {
            type: 'object',
            required: ['expression'],
            properties: {
              expression: {
                type: 'string',
                description: 'The mathematical expression to evaluate, e.g. "2 + 2 * 3"'
              }
            }
          }
        }
      ]
    }
  }
];

/**
 * Register a tool with the Gemini server
 * @param {object} tool - The tool to register
 */
async function registerTool(tool) {
  try {
    const response = await fetch(`${GEMINI_SERVER_URL}/api/register-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tool)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register tool: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Successfully registered tool ${tool.toolId}: ${data.message}`);
  } catch (error) {
    console.error(`❌ Error registering tool ${tool.toolId}:`, error.message);
  }
}

/**
 * Mock implementation of tool execution
 * This simulates how the tool proxy would handle tool execution
 */
async function mockToolExecution(toolId, args) {
  console.log(`🔧 Executing tool: ${toolId}`);
  console.log(`Arguments:`, args);
  
  // Mock implementations of our example tools
  if (toolId === 'get_weather') {
    const location = args.location;
    const unit = args.unit || 'celsius';
    
    // In a real implementation, this would call a weather API
    return {
      location,
      temperature: unit === 'celsius' ? 22 : 72,
      condition: 'Sunny',
      humidity: 65,
      wind: '10 km/h',
      unit
    };
  }
  
  if (toolId === 'calculate') {
    const expression = args.expression;
    
    // Careful evaluation of the expression (for demo only)
    // In a real implementation, you would use a safer method
    try {
      // This is not safe for production use
      const result = eval(expression);
      return {
        expression,
        result
      };
    } catch (error) {
      return {
        expression,
        error: 'Invalid expression'
      };
    }
  }
  
  return { error: `Tool ${toolId} not implemented` };
}

/**
 * Generate text with Gemini using tool calling
 * @param {string} prompt - The user prompt
 * @param {string[]} tools - Tool IDs to make available
 */
async function generateWithTools(prompt, tools) {
  try {
    console.log(`\n📝 Generating response for: "${prompt}"`);
    console.log(`Available tools: ${tools.join(', ')}`);
    
    const response = await fetch(`${GEMINI_SERVER_URL}/api/generate-with-tools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, tools })
    });
    
    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if tools were called
    if (data.result.toolCalls && data.result.toolCalls.length > 0) {
      console.log(`\n🛠️ Gemini used ${data.result.toolCalls.length} tools:`);
      
      for (const toolCall of data.result.toolCalls) {
        console.log(`  Tool: ${toolCall.tool}`);
        console.log(`  Args: ${JSON.stringify(toolCall.args, null, 2)}`);
        console.log(`  Result: ${JSON.stringify(toolCall.result, null, 2)}`);
      }
    }
    
    console.log('\n✨ Final response:');
    console.log(data.result.text);
    
    return data.result;
  } catch (error) {
    console.error(`❌ Error generating with tools:`, error);
    return null;
  }
}

// Intercept tool calls from Gemini and mock their execution
// In a real implementation, this would be handled by the tool proxy
// For the purposes of this example, we're mocking the execution
async function setupToolIntercept() {
  // Override the fetch function to intercept calls to the execute endpoint
  const originalFetch = global.fetch;
  
  global.fetch = async function(url, options) {
    // Check if this is a call to execute-tool
    if (url.toString().includes('/api/execute-tool')) {
      const body = JSON.parse(options.body);
      const { toolId, args } = body;
      
      // Mock the tool execution
      const result = await mockToolExecution(toolId, args);
      
      // Return a mocked response
      return {
        ok: true,
        json: async () => ({ success: true, result }),
        text: async () => JSON.stringify({ success: true, result }),
        status: 200
      };
    }
    
    // Pass through to original fetch for all other calls
    return originalFetch(url, options);
  };
}

/**
 * Run the example
 */
async function runExample() {
  try {
    // Setup tool intercept for mocking
    await setupToolIntercept();
    
    console.log('🚀 Starting Gemini with Tools Example');
    
    // Register our example tools
    console.log('\n📚 Registering tools with Gemini:');
    for (const tool of EXAMPLE_TOOLS) {
      await registerTool(tool);
    }
    
    // Example 1: Weather query
    await generateWithTools(
      "What's the weather like in London? And tell me what I should wear based on the temperature.",
      ['weather_tool']
    );
    
    // Example 2: Calculator
    await generateWithTools(
      "I need to calculate the average of these numbers: 23, 45, 67, 89. Then multiply the result by 1.5.",
      ['calculator_tool']
    );
    
    // Example 3: Use both tools
    await generateWithTools(
      "I'm planning a trip to Paris where it's currently 22°C. I need to convert this to Fahrenheit for my American friends. Also, can you calculate how much it would cost in euros if I spend $100 per day for 7 days, with an exchange rate of 1 USD = 0.85 EUR?",
      ['weather_tool', 'calculator_tool']
    );
    
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error running example:', error);
  }
}

runExample(); 