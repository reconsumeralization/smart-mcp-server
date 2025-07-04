/**
 * @fileoverview MCP Tool for Creating A2A Agents
 *
 * This tool allows the Smart MCP Server to programmatically create and register
 * new A2A agents within the network. It leverages the /a2a/agents/register endpoint
 * to generate a unique agent ID and API key for the new agent.
 */

import fetch from 'node-fetch';
import config from '../../config.js';
import logger from '../../logger.js';

const serverUrl = `http://${config.server.host}:${config.server.port}`;

export const create_a2a_agent = {
  name: "create_a2a_agent",
  description: "Creates and registers a new A2A agent with the Smart MCP Server.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The human-readable name of the new A2A agent.",
      },
      description: {
        type: "string",
        description: "A brief description of the new A2A agent's purpose.",
      },
      capabilities: {
        type: "array",
        items: {
          type: "string",
        },
        description: "A list of capabilities the new A2A agent possesses (e.g., \"text-generation\", \"data-analysis\").",
      },
      url: {
        type: "string",
        description: "The URL where the new A2A agent can be reached (e.g., \"cloud\" or a specific endpoint).",
        default: "cloud",
      },
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            tags: { type: "array", items: { type: "string" } }
          },
          required: ["id", "name", "description", "tags"]
        },
        description: "A list of specific skills the new A2A agent possesses.",
        default: []
      },
    },
    required: ["name", "description", "capabilities"],
  },
  async execute({ name, description, capabilities, url, skills }) {
    const agentCard = {
      name,
      description,
      url,
      capabilities: capabilities.map(cap => ({ name: cap, description: `Capability for ${cap}` })),
      skills: skills,
      version: "1.0.0",
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
    };

    try {
      const response = await fetch(`${serverUrl}/a2a/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentCard),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to register A2A agent: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      logger.info(`Successfully created A2A agent: ${name} (ID: ${result.agentId})`);
      return { success: true, agentId: result.agentId, apiKey: result.apiKey };
    } catch (error) {
      logger.error(`Error creating A2A agent: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
}; 