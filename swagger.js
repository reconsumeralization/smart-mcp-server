import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// --- FULLY LOADED SWAGGER DEFINITION ---

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Smart MCP Server API',
    version: '1.0.0',
    description: `
      <b>Smart MCP Server</b> provides a secure, context-aware, and extensible API for orchestrating tools, workflows, and agent-to-agent (A2A) protocols.<br>
      <br>
      <b>Key Features:</b>
      <ul>
        <li>Tool registry and execution with risk controls</li>
        <li>Workflow management and execution</li>
        <li>Agent-to-Agent (A2A) protocol endpoints</li>
        <li>Domain/category-based tool filtering</li>
        <li>JWT-based authentication</li>
        <li>Comprehensive error handling</li>
      </ul>
      <br>
      <b>Contact:</b> <a href="https://github.com/reconsumeralization/smart-mcp-server">MCP Team</a>
    `,
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'MCP Team',
      url: 'https://github.com/reconsumeralization/smart-mcp-server',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.mcp-server.app',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
      },
    },
    schemas: {
      Tool: {
        type: 'object',
        required: ['id', 'name', 'category'],
        properties: {
          id: { type: 'string', example: 'tool-123' },
          name: { type: 'string', example: 'Weather Lookup' },
          description: {
            type: 'string',
            example: 'Fetches current weather for a given city.',
          },
          category: {
            type: 'string',
            enum: [
              'database',
              'github',
              'memory',
              'ai',
              'other',
              'mft',
              'edi',
              'core',
            ],
            example: 'ai',
          },
          tokenCost: { type: 'number', example: 5 },
          isConnected: { type: 'boolean', example: true },
          capabilities: {
            type: 'object',
            properties: {
              sampling: { type: 'boolean', example: false },
              contextAggregation: { type: 'boolean', example: true },
              securityBoundaries: { type: 'boolean', example: true },
              notificationSupport: { type: 'boolean', example: false },
              version: { type: 'string', example: '1.2.0' },
            },
          },
          mcpActions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'getWeather' },
                description: {
                  type: 'string',
                  example: 'Get weather for a city',
                },
                parameters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'city' },
                      type: { type: 'string', example: 'string' },
                      required: { type: 'boolean', example: true },
                      description: { type: 'string', example: 'City name' },
                      defaultValue: { type: 'string', example: 'New York' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      Workflow: {
        type: 'object',
        required: ['id', 'name', 'steps'],
        properties: {
          id: { type: 'string', example: 'workflow-abc' },
          name: { type: 'string', example: 'Weather and News' },
          description: {
            type: 'string',
            example: 'Get weather and then fetch news.',
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'tool', 'action'],
              properties: {
                id: { type: 'string', example: 'step-1' },
                name: { type: 'string', example: 'Get Weather' },
                tool: { type: 'string', example: 'weather-tool' },
                action: { type: 'string', example: 'getWeather' },
                parameters: { type: 'object', example: { city: 'New York' } },
                conditions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', example: 'if' },
                      source: { type: 'string', example: 'previousStep' },
                      operator: { type: 'string', example: '==' },
                      value: { type: 'string', example: 'success' },
                      target: { type: 'string', example: 'step-2' },
                    },
                  },
                },
              },
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T12:00:00Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T12:05:00Z',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'TOOL_NOT_FOUND' },
          message: {
            type: 'string',
            example: 'No tool found with ID: tool-xyz',
          },
          details: { type: 'object', example: { toolId: 'tool-xyz' } },
        },
      },
      A2ATaskRequest: {
        type: 'object',
        required: ['task_description'],
        properties: {
          task_id: {
            type: 'string',
            description:
              'Optional ID for the task, one will be generated if not provided.',
            example: 'task-12345',
          },
          task_description: {
            type: 'string',
            description:
              'A natural language description of the task to be performed.',
            example:
              'Find out the current weather in New York and then search for top news headlines.',
          },
        },
      },
      A2AWorkflowResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string', example: 'task-12345' },
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed'],
            example: 'pending',
          },
          artifacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'workflow_execution_request' },
                content: {
                  type: 'object',
                  properties: {
                    workflowId: { type: 'string', example: 'workflow-abc' },
                    context: { type: 'object', example: { city: 'New York' } },
                  },
                },
              },
            },
          },
        },
      },
      WorkflowExecution: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'exec-uuid-123' },
          workflowId: { type: 'string', example: 'workflow-abc' },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
            example: 'running',
          },
          startTime: { type: 'number', example: 1710000000 },
          endTime: { type: 'number', nullable: true, example: null },
          steps: {
            type: 'array',
            items: { type: 'object' },
            example: [{ id: 'step-1', status: 'completed' }],
          },
          results: { type: 'object', example: { weather: 'Sunny' } },
          errors: { type: 'array', items: { type: 'object' }, example: [] },
          context: { type: 'object', example: { city: 'New York' } },
        },
      },
    },
  },
  tags: [
    {
      name: 'A2A Protocol',
      description:
        'Endpoints for Agent-to-Agent (A2A) communication, including task requests and workflow responses.',
    },
    {
      name: 'Tools',
      description:
        'API endpoints for listing, retrieving, and executing tools. Tools are grouped by domain/category.',
    },
    {
      name: 'Workflows',
      description:
        'API endpoints for creating, listing, and executing workflows. Workflows are sequences of tool actions.',
    },
    {
      name: 'Execution',
      description:
        'API endpoints for executing tools and workflows, with risk controls and context tracking.',
    },
    {
      name: 'Health',
      description: 'API endpoints for system health, status, and monitoring.',
    },
  ],
  externalDocs: {
    description: 'Find more info here',
    url: 'https://github.com/reconsumeralization/smart-mcp-server',
  },
};

// --- SWAGGER DOCS OPTIONS ---

const options = {
  swaggerDefinition,
  apis: ['./server.js', './index.js', './workflow-api.js'],
};

// --- GENERATE SWAGGER SPEC ---

const swaggerSpec = swaggerJSDoc(options);

// --- SWAGGER UI OPTIONS ---

const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { font-weight: bold; color: #1a237e; }
    .swagger-ui .info .base-url { color: #388e3c; }
  `,
  customSiteTitle: 'Smart MCP Server API',
  customfavIcon:
    'https://raw.githubusercontent.com/reconsumeralization/smart-mcp-server/main/public/favicon.ico',
};

// --- SWAGGER SETUP FUNCTION ---

export const setupSwagger = (app) => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  // eslint-disable-next-line no-console
  console.log(
    '\x1b[36m%s\x1b[0m',
    'Swagger API docs available at http://localhost:3000/api-docs'
  );
};

export default setupSwagger;
