import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Smart MCP Server API',
    version: '1.0.0',
    description: 'REST API documentation for the Smart MCP Server',
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
      },
    },
    schemas: {
      Tool: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { 
            type: 'string',
            enum: ['database', 'github', 'memory', 'ai', 'other', 'mft', 'edi', 'core']
          },
          tokenCost: { type: 'number' },
          isConnected: { type: 'boolean' },
          capabilities: { 
            type: 'object',
            properties: {
              sampling: { type: 'boolean' },
              contextAggregation: { type: 'boolean' },
              securityBoundaries: { type: 'boolean' },
              notificationSupport: { type: 'boolean' },
              version: { type: 'string' }
            }
          },
          mcpActions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                parameters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      required: { type: 'boolean' },
                      description: { type: 'string' },
                      defaultValue: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                tool: { type: 'string' },
                action: { type: 'string' },
                parameters: { type: 'object' },
                conditions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      source: { type: 'string' },
                      operator: { type: 'string' },
                      value: { type: 'string' },
                      target: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' }
        }
      },
      A2ATaskRequest: {
        type: 'object',
        required: ['task_description'],
        properties: {
          task_id: { 
            type: 'string',
            description: 'Optional ID for the task, one will be generated if not provided.',
            example: 'task-12345'
          },
          task_description: {
            type: 'string',
            description: 'A natural language description of the task to be performed.',
            example: 'Find out the current weather in New York and then search for top news headlines.'
          }
        }
      },
      A2AWorkflowResponse: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
          artifacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'workflow_execution_request' },
                content: {
                  type: 'object',
                  properties: {
                    workflowId: { type: 'string' },
                    context: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'A2A Protocol',
      description: 'Endpoints for Agent-to-Agent (A2A) communication',
    },
    {
      name: 'Tools',
      description: 'API endpoints for managing tools',
    },
    {
      name: 'Workflows',
      description: 'API endpoints for workflow operations',
    },
    {
      name: 'Execution',
      description: 'API endpoints for executing tools and workflows',
    },
    {
      name: 'Health',
      description: 'API endpoints for system health and monitoring',
    }
  ],
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Path to the API docs
  apis: [
    './server.js',
    './index.js',
    './workflow-api.js',
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Swagger UI setup
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Smart MCP Server API",
};

export const setupSwagger = (app) => {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger API docs available at /api-docs');
};

export default setupSwagger; 