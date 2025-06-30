# Smart MCP Server: The Complete Guide

This guide provides a comprehensive overview of the Smart MCP Server, from high-level architecture to detailed deployment and integration instructions.

---
## 1. Introduction (from README.md)
# Smart MCP Server (Gemini Edition)

This project is a sophisticated, context-aware agent that leverages Google's Gemini models for intelligent workflow execution. It is compliant with both the Model Context Protocol (MCP) and the Agent-to-Agent (A2A) protocol, allowing it to serve as a powerful tool in a multi-agent system.

The server dynamically loads and manages workflows, using Gemini's native function calling capabilities to intelligently select and execute the correct workflow based on natural language task descriptions.

## Key Features

- **Gemini-Powered Intelligence**: Uses Gemini (configurable model, e.g., `gemini-pro`) for state-of-the-art function calling to drive workflow selection.
- **A2A Compliant**: Implements the Agent-to-Agent protocol, allowing it to communicate and collaborate with other AI agents. Includes `/.well-known/agent.json` for discovery and a `/a2a/tasks` endpoint for execution.
- **Dynamic Workflow System**: Automatically loads workflow definitions from JSON files, making it easy to add or modify complex processes without changing the core code.
- **Centralized Configuration**: A single `config.js` file manages all essential settings, from server ports to API keys.
- **Extensible and Modular**: The architecture is designed to be easily extended with new workflows and capabilities.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/reconsumeralization/smart-mcp-server.git
    cd smart-mcp-server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment:**
    - Copy the `.env.example` file to a new file named `.env`:
      ```bash
      cp .env.example .env
      ```
    - Open the `.env` file and add your Google Gemini API key:
      ```
      GEMINI_API_KEY=your_gemini_api_key_here
      ```

### Running the Server

-   **To start the server in production mode:**
    ```bash
    npm start
    ```
-   **To start the server in development mode (with hot reloading):**
    ```bash
    npm run dev
    ```

The server will start on the port defined in your configuration (default is `3000`).

## API Documentation

API documentation is available via Swagger UI. Once the server is running, you can access it at:

`http://localhost:3000/api-docs`

This interface allows you to explore and interact with all the available endpoints, including the A2A task endpoint.

## How It Works

1.  **A2A Task Received**: An external agent sends a POST request to the `/a2a/tasks` endpoint with a `task_description`.
2.  **Workflow Selection**: The server prepares a list of all available workflows and sends them along with the task description to the Gemini API.
3.  **Gemini Function Calling**: Gemini analyzes the task and selects the most appropriate workflow to execute, returning it as a "function call".
4.  **Workflow Execution**: The `WorkflowManager` executes the selected workflow, processing each step and interpolating the necessary arguments.
5.  **A2A Response**: The server returns the result of the workflow execution in a standard A2A format.

## Adding New Workflows

To add a new workflow, simply create a new `.json` file in the `/examples` directory. The server will automatically load it on startup. Ensure the workflow JSON is valid and includes the required `id`, `name`, `description`, and `steps` fields.

## 🚀 Overview

Smart MCP Server is a powerful middleware that serves as a context-aware bridge between AI models and tools. It analyzes user context, historical patterns, and content to intelligently present the most relevant tools, improving efficiency and reducing cognitive load. This repository provides the core server, a context-aware selector, and integrations with various services including Google's Gemini API.

## ✨ Key Features

- **Context-Aware Tool Selection**: Intelligently selects and presents tools based on:
  - User message content and context
  - Historical usage patterns
  - Tool categories (filesystem, code editing, AI, etc.)
  - Essential tool designation

- **Tool Server Architecture**: Manages multiple tool server instances with:
  - Server lifecycle management
  - Tool registration
  - Execution proxying
  - Error handling

- **Gemini API Integration**: Full integration with Google's Gemini models:
  - Text generation
  - JSON response formatting
  - Streaming capabilities
  - Advanced model configuration

- **Workflow System**: Define, execute, and monitor complex workflows:
  - Sequential and parallel step execution
  - Dependency management
  - Variable storage and interjection
  - Progress monitoring
  - Execution history

- **Documentation Automation**: Tools for gathering and ingesting documentation:
  - Repository scanning
  - Markdown parsing
  - Documentation structure analysis
  - Knowledge integration

## 📋 Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)
- For Gemini API: Google AI API key

## 🔧 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/reconsumeralization/smart-mcp-server.git
   cd smart-mcp-server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## 🏗️ Project Structure

```plaintext
smart-mcp-server/
├── context-aware-selector.js  # Tool selection based on context
├── docs/                      # Documentation files
├── examples/                  # Example scripts
├── lib/                       # Shared libraries
├── schema/                    # Tool schema definitions
├── server.js                  # Main server implementation
├── servers/                   # Tool server implementations
├── test/                      # Test files
├── tool-proxy.js              # Tool execution proxy
├── tools/                     # Tool implementations
└── workflow-monitor.js        # Workflow monitoring system
```

## 🚀 Advanced Examples

### 1. Multi-Tool Orchestration

Combine multiple tools for complex tasks:

```javascript
import { ToolOrchestrator } from './lib/tool-orchestrator.js';

// Create an orchestrator with error handling and retry logic
const orchestrator = new ToolOrchestrator({
  maxRetries: 3,
  retryDelay: 1000,
  fallbackStrategy: 'alternative-tool'
});

// Define a complex task using multiple tools
const task = orchestrator.createTask()
  .use('gemini-tool')
    .withConfig({ temperature: 0.2 })
    .forStep('analyze-requirements')
  .use('github-tool')
    .withAuth(process.env.GITHUB_TOKEN)
    .forStep('create-pr')
  .use('database-tool')
    .withRetry(5)
    .forStep('store-results');

// Execute with progress monitoring
const result = await task.execute({
  onProgress: (step, progress) => console.log(`${step}: ${progress}%`),
  onError: (step, error) => console.error(`Error in ${step}:`, error)
});
```

### 2. Context-Aware Tool Selection with Memory

```javascript
import { ContextAnalyzer } from './lib/context-analyzer.js';
import { MemoryStore } from './lib/memory-store.js';

// Initialize with persistent memory
const memory = new MemoryStore({
  storage: 'redis',
  ttl: '24h',
  namespace: 'tool-selection'
});

const analyzer = new ContextAnalyzer({
  memory,
  embeddings: true,
  contextWindow: 10
});

// Analyze context with historical data
const toolSuggestions = await analyzer.analyze({
  currentMessage: "Help me optimize this SQL query",
  userHistory: await memory.getUserHistory('user123'),
  projectContext: {
    language: 'SQL',
    database: 'PostgreSQL',
    performance: true
  }
});

// Get ranked tool suggestions with confidence scores
const rankedTools = toolSuggestions.getRankedTools();
console.log(rankedTools);
// [
//   { tool: 'database-optimizer', confidence: 0.95 },
//   { tool: 'query-analyzer', confidence: 0.85 },
//   { tool: 'performance-monitor', confidence: 0.75 }
// ]
```

### 3. Advanced Workflow with Error Recovery

```javascript
import { WorkflowBuilder } from './lib/workflow-builder.js';
import { ErrorRecoveryStrategy } from './lib/error-recovery.js';

// Create a workflow with sophisticated error handling
const workflow = new WorkflowBuilder()
  .addNode('data-extraction', {
    tool: 'database-tool',
    fallback: 'file-system-tool',
    validation: (data) => data.length > 0
  })
  .addNode('data-transformation', {
    tool: 'gemini-tool',
    retries: 3,
    // ... more configuration
  });

// ... build the rest of the workflow
```

---
## 2. A2A Integration (from A2A_INTEGRATION.md)
# A2A Integration Guide

This document provides technical instructions for external AI agents to communicate with the Smart MCP Server using the Agent-to-Agent (A2A) protocol. Following this guide will ensure reliable communication and task execution.

## Protocol Flow Overview

The interaction model is asynchronous and designed for potentially long-running tasks:
1.  **Discover:** Your agent first asks the server for its capabilities by fetching its "Agent Card".
2.  **Submit Task:** Your agent submits a task using a natural language description. The server immediately accepts the task and provides an `executionId`.
3.  **Poll for Results:** Your agent uses the `executionId` to periodically check for the task's status until it is `completed` or `failed`.
4.  **Retrieve Results:** Once completed, the final result of the workflow is available in the execution object.

---

## 1. Agent Discovery

To understand what the server can do, perform a `GET` request to its `.well-known` endpoint.

`GET /.well-known/agent.json`

This will return the agent's "card," a JSON object describing its identity and capabilities.

### Example Response (`agent.json`):
```json
{
  "agent_id": "smart-mcp-gateway",
  "name": "Smart MCP Gateway",
  "description": "An intelligent gateway that provides access to a variety of tools and capabilities by dynamically selecting the most relevant ones for a given task.",
  "version": "1.0.0",
  "endpoints": {
    "task_execution": "/a2a/tasks"
  },
  "capabilities": [
    {
      "name": "workflow_execution",
      "description": "Executes a workflow by intelligently selecting from available workflows based on a natural language task description.",
      "parameters": {
        "type": "object",
        "required": ["task_description"],
        "properties": {
          "task_description": {
            "type": "string",
            "description": "A description of the task you want to accomplish."
          }
        }
      }
    }
  ]
}
```

---

## 2. Task Submission

To have the agent perform a task, send a `POST` request to the `/a2a/tasks` endpoint.

`POST /a2a/tasks`

### Request Body
The body must be JSON and contain a `task_description`.

```json
{
  "task_description": "Create a new Stripe customer named 'John Doe' with the email 'john.doe@example.com' and then create a new product called 'Premium Subscription'."
}
```

### Example `curl` Request:
```bash
curl -X POST http://localhost:3000/a2a/tasks \
-H "Content-Type: application/json" \
-d '{
  "task_description": "Create a Stripe payment link for a product named LangSnap Pro that costs $15 USD."
}'
```

### Response
The server will respond **immediately** with the initial state of the workflow execution object. This confirms that the task has been accepted and is running. You **must** store the `id` from this response to check for the result later.

#### Example Immediate Response:
```json
{
    "id": "e7f8c9b0-a1b2-4c3d-8e9f-0a1b2c3d4e5f",
    "workflowId": "stripe-sell-product",
    "status": "pending",
    "startTime": 1678886400000,
    "endTime": null,
    "context": {
        "productName": "LangSnap Pro",
        "amount": 1500,
        "currency": "usd"
    },
    "steps": [ ... ],
    "results": {},
    "errors": [],
    "pendingSteps": [ "create_product", "create_price", "create_payment_link" ],
    "completedSteps": []
}
```

---

## 3. Retrieving Task Status and Results

Because the workflow runs in the background, you must poll the server for updates using the `id` you received in the previous step.

Perform a `GET` request to the task status endpoint:

`GET /a2a/tasks/{executionId}`

### Example `curl` Request:
```bash
curl http://localhost:3000/a2a/tasks/e7f8c9b0-a1b2-4c3d-8e9f-0a1b2c3d4e5f
```

### Response
The response will be the full, up-to-date workflow execution object. Keep polling this endpoint (e.g., every 1-2 seconds, with backoff) until the `status` field is either `completed` or `failed`.

#### Example Final Response (`status: "completed"`):
```json
{
    "id": "e7f8c9b0-a1b2-4c3d-8e9f-0a1b2c3d4e5f",
    "workflowId": "stripe-sell-product",
    "status": "completed",
    "startTime": 1678886400000,
    "endTime": 1678886405000,
    "context": { ... },
    "steps": [ ... ],
    "results": {
        "create_product": { "id": "prod_123...", "name": "LangSnap Pro", ... },
        "create_price": { "id": "price_456...", "unit_amount": 1500, ... },
        "create_payment_link": { "id": "plink_789...", "url": "https://buy.stripe.com/...", ... }
    },
    "errors": [],
    "pendingSteps": [],
    "completedSteps": [ "create_product", "create_price", "create_payment_link" ]
}
```

The final result of the workflow is contained within the `results` object. 

---
## 3. Deployment (from DEPLOYMENT.md)
# Deployment Guide

This guide provides instructions for deploying the Smart MCP Server to a production environment.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your deployment server:
- [Node.js](https://nodejs.org/) (v18.x or later recommended)
- [Redis](https://redis.io/docs/getting-started/installation/) (v6.x or later)
- A process manager for Node.js, such as [PM2](https://pm2.keymetrics.io/), is highly recommended for production.

## 2. Configuration

The application is configured using environment variables. Create a `.env` file in the root of the project for production. **Do not commit this file to source control.**

### `.env` Example:
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Stripe API Key
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# Redis Connection
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password (if applicable)
```

### Key Variables
- `NODE_ENV`: Set to `production` to enable optimizations, structured JSON logging, and error masking.
- `PORT`: The port the server will listen on.
- `GEMINI_API_KEY`: Your API key for the Google Gemini services.
- `STRIPE_SECRET_KEY`: Your secret key for the Stripe API.
- `REDIS_*`: Connection details for your Redis instance, which is required for workflow state management.

## 3. Installation

Clone the repository and install the dependencies:
```bash
git clone <your-repo-url>
cd smart-mcp-server
npm install --production
```
Using the `--production` flag will skip the installation of development-only dependencies.

## 4. Running the Application

While you can run the application directly with `node server.js`, it is highly recommended to use a process manager like `pm2` in production. This will handle automatic restarts, clustering (to leverage all CPU cores), and log management.

### Using PM2

1. **Install PM2 globally:**
   ```bash
   npm install pm2 -g
   ```

2. **Start the application in cluster mode:**
   This command will start an instance of the server on each available CPU core, providing load balancing and maximizing performance.
   ```bash
   pm2 start server.js -i max --name "smart-mcp-server"
   ```
   - `-i max`: Tells PM2 to launch the maximum number of processes based on available CPUs.
   - `--name`: Assigns a name to the process list.

3. **Managing the Application with PM2:**
   - `pm2 list`: View the status of all running processes.
   - `pm2 logs smart-mcp-server`: Stream the logs from the application.
   - `pm2 restart smart-mcp-server`: Restart the application.
   - `pm2 stop smart-mcp-server`: Stop the application.

4. **Saving the PM2 Process List:**
   To ensure your application restarts automatically after a server reboot, run:
   ```bash
   pm2 save
   pm2 startup
   ```
   PM2 will provide a command to run to configure the startup script for your specific OS.

## 5. Dockerization (Recommended)

For the most robust and portable deployment, we recommend running the application as a Docker container. See the `Dockerfile` and `docker-compose.yml` files in the repository for a ready-to-use setup.

---
## 4. Stripe Services & Policies (from docs/compliance/stripe_services_and_policies.md)
# Stripe Services & Policies

This document provides a comprehensive overview of Stripe's products, services, and relevant policies for the purpose of integration, white-labeling, and multi-tenant brokerage services.

## 1. Stripe Product & Service Catalog

Based on the official Stripe sitemap and product pages, Stripe's offerings are categorized as follows:

### 1.1. Global Payments
*   **Payments:** Core online payment processing.
    *   **Payment Links:** No-code payment pages.
    *   **Checkout:** Prebuilt, embeddable payment forms.
    *   **Elements:** Flexible UI components for building custom payment forms.
*   **Terminal:** In-person payment processing.
*   **Radar:** Fraud prevention and risk management.
*   **Authorization:** AI-based acceptance rate optimizations.

### 1.2. Money Management
*   **Connect:** Payment processing for platforms and marketplaces.
*   **Payouts (Global Payouts):** Services for sending money to third parties.
*   **Capital:** Business financing and loans for platform customers.
*   **Issuing:** Creation and management of physical and virtual cards.
*   **Treasury:** Financial accounts and banking-as-a-service infrastructure.

### 1.3. Revenue and Finance Automation
*   **Billing:** Subscription management and recurring billing.
*   **Revenue Recognition:** Automation for accounting and revenue reporting.
*   **Tax:** Automation for sales tax, VAT, and GST.
*   **Invoicing:** Online invoice creation and management.
*   **Sigma:** Custom SQL-based reporting and analytics.
*   **Data Pipeline:** Data synchronization with data warehouses (e.g., Snowflake, Redshift).

### 1.4. Additional Services & Tools
*   **Payment Methods:** Access to over 100 global payment methods.
*   **Link:** Accelerated one-click checkout.
*   **Financial Connections:** Securely link customer financial account data.
*   **Identity:** Online identity verification services.
*   **Atlas:** Startup incorporation and setup services.
*   **Climate:** Carbon removal purchasing and contributions.

---

## 2. Stripe Reseller & Partner Policies (Summary)

This section summarizes the key terms from the `Stripe Terminal Reseller Terms` and the `Stripe Partner Ecosystem Agreement`. This is not a replacement for the full legal documents but highlights the most relevant points for our use case.

### 2.1. Core Principles
*   **Independent Contractor:** At all times, our entity is an independent contractor, not an agent, employee, or joint venturer with Stripe. We are responsible for our own business, employees, and actions.
*   **Compliance with Laws:** We must comply with all applicable laws, including financial services regulations, consumer protection, data privacy, anti-spam, and anti-corruption laws in all jurisdictions we operate in.
*   **No Misrepresentation:** We must not mislead any third party or cause any reputational harm to Stripe.

### 2.2. Reselling & Distribution
*   **Appointment:** We are appointed as a non-exclusive reseller and distributor. We do not have exclusive rights.
*   **Permitted Purpose:** Resale, marketing, and distribution must be solely for the purpose of encouraging and enabling the use of Stripe services (e.g., Stripe Terminal).
*   **Geographic Restrictions:** Products may not be resold or distributed outside of countries where Stripe officially supports them.
*   **End-User Agreement:** We must ensure our end-users agree to the applicable Stripe terms (e.g., Stripe Terminal Purchase Terms).
*   **No Sub-Distribution:** We cannot resell to another entity that intends to resell without prior written consent from Stripe.

### 2.3. Branding & Marketing
*   **Stripe Marks Usage:** All marketing must comply with the `Stripe Marks Usage Agreement`. We can identify ourselves as a "Stripe Partner."
*   **No Alteration:** We cannot remove or alter any Stripe trademarks, logos, or branding on their products or packaging without prior written approval.
*   **Co-Branding:** We *may* be able to include our own trademarks on products in addition to Stripe's existing marks.
*   **Marketing Support:** Stripe may, at its discretion, provide co-selling support, marketing incentives, and other resources through its Partner Program.

### 2.4. Key Restrictions
*   **Restricted Businesses:** We cannot resell to any person or entity on Stripe's `Restricted Businesses` list.
*   **Prohibited Use Cases:** We cannot resell to entities that intend to use the products for unlawful conduct, for personal/family/household use, or for benchmarking/testing purposes.
*   **No Binding Obligations:** We have no authority to enter into any legally binding obligation on behalf of Stripe.

### 2.5. Program-Specifics
*   **Stripe Partner Portal:** We must maintain an account and use the portal for official communications, policy updates, and accessing program benefits.
*   **Lead Data:** If we provide lead data to Stripe, we must have obtained clear, affirmative consent from the lead, compliant with all relevant data protection laws.

---

## 3. Legal & Regulatory Landscape (USA)

This section provides a high-level overview of the major U.S. regulations governing payment processing and reselling. It is for informational purposes and is not legal advice.

### 3.1. Key Regulatory Bodies & Acts
*   **FinCEN (Financial Crimes Enforcement Network):** A bureau of the U.S. Treasury that is the primary regulator for combating money laundering and other financial crimes.
*   **Bank Secrecy Act (BSA):** The primary U.S. anti-money laundering (AML) law. Requires financial institutions to assist the government in detecting and preventing money laundering.
*   **USA PATRIOT Act:** Expands the BSA, requiring comprehensive customer identification and verification programs (CIP) to prevent financing of terrorism.
*   **OFAC (Office of Foreign Assets Control):** Enforces economic and trade sanctions. Prohibits transactions with individuals and entities on its Specially Designated Nationals (SDN) list.
*   **FTC (Federal Trade Commission) & CFPB (Consumer Financial Protection Bureau):** Enforce consumer protection laws and can take action against payment processors who facilitate fraudulent or deceptive business practices.

### 3.2. Money Services Business (MSB) & Money Transmitter Status
*   **Definition:** An entity that accepts currency/funds and transmits them to another location or person is generally considered a **Money Transmitter**, which is a type of MSB.
*   **Obligations:** Money Transmitters must:
    1.  Register with FinCEN at the federal level.
    2.  Obtain state-by-state money transmitter licenses (required in ~48 states). This is a costly and complex process.
    3.  Implement a formal Anti-Money Laundering (AML) program, which includes "Know Your Customer" (KYC) procedures, transaction monitoring, and filing Suspicious Activity Reports (SARs).

### 3.3. The "Payment Processor" & "Agent of Payee" Exemptions
*   Crucially, a company is generally **exempt** from being classified as a money transmitter if it meets specific criteria.
*   **Payment Processor Exemption:** This applies if the entity:
    1.  Facilitates the purchase of goods or services.
    2.  Operates exclusively through clearance and settlement systems that only admit BSA-regulated financial institutions (e.g., card networks, ACH).
    3.  Acts under a formal agreement with the seller/creditor receiving the funds.
*   **Agent of the Payee:** In many states, an entity is not a money transmitter if it is acting as an "agent of the payee" – meaning it is authorized by the merchant (the payee) to accept payments on their behalf.

### 3.4. Implications for Our Model
*   By using Stripe's services, particularly products like **Stripe Connect**, we operate under their regulatory umbrella. Stripe is the licensed and registered entity that handles the actual transmission of funds.
*   Our role becomes that of a technology provider or platform. We facilitate the connection between our tenants/brokers and Stripe's processing services.
*   **Key to Compliance:** We must ensure we operate within the "payment processor" or "agent" exemption. This means we should **never take possession or control of the funds**. The money must flow directly from the customer through the card networks to Stripe, who then settles it to the end merchant/broker. Our system can *initiate* and *manage* these flows via the Stripe API, but we must not be in the direct chain of custody of the money.
*   We still have **indirect responsibilities**, such as performing due diligence on our tenants (sub-merchants) to prevent fraud, monitoring for suspicious activity, and adhering to Stripe's terms of service, which include their list of prohibited businesses.

---

## 4. Legal & Regulatory Landscape (Canada)

This section provides a high-level overview of the major Canadian regulations governing payment processing and reselling. It is for informational purposes and is not legal advice.

### 4.1. Key Regulatory Bodies & Acts
*   **FINTRAC (Financial Transactions and Reports Analysis Centre of Canada):** Canada's financial intelligence unit. Its mandate is to facilitate the detection, prevention, and deterrence of money laundering and the financing of terrorist activities.
*   **PCMLTFA (Proceeds of Crime (Money Laundering) and Terrorist Financing Act):** The primary Canadian anti-money laundering (AML) and counter-terrorist financing legislation.
*   **Retail Payment Activities Act (RPAA):** A new regulatory framework requiring Payment Service Providers (PSPs) to register with the Bank of Canada and establish a risk management framework.

### 4.2. Money Services Businesses (MSBs) in Canada
*   **Definition:** Similar to the U.S., businesses that perform certain financial services are classified as MSBs. This includes foreign exchange dealing, remitting or transmitting funds, and issuing or redeeming money orders.
*   **Registration:** MSBs must register with FINTRAC.
*   **Obligations:** Registered MSBs have obligations, including reporting, record keeping, client identification (KYC), and maintaining a compliance program.

### 4.3. Implications for Our Platform (The Stripe Agent Model)
*   **Agent of an MSB Exemption:** The PCMLTFA provides an exemption for agents of other reporting entities. If Stripe is registered with FINTRAC, and we are acting as their exclusive agent under a formal agreement, we may be exempt from separate registration.
*   **RPAA & PSPs:** Under the new RPAA, our platform would likely be considered a Payment Service Provider (PSP). The act will require registration with the Bank of Canada and the implementation of a sound operational risk management framework. We must monitor the implementation timeline for the RPAA and ensure compliance when it comes into full force.

*This document will be updated with Legal/Compliance information for Canada in the next phases of research.*

---
## 5. Context-Aware Tool Selector (from docs/context-aware-selector.md)
# Context-Aware Tool Selector

The Context-Aware Tool Selector is a core component of the Smart MCP Server that intelligently selects and recommends the most relevant tools based on user context. It uses a sophisticated scoring system to determine which tools are most likely to be useful for a given user query or scenario.

## Key Features

- **Context-based scoring**: Analyzes user messages to identify relevant tools
- **Category-based organization**: Groups tools into functional categories
- **Recent usage tracking**: Considers previously used tools for better recommendations
- **Essential tools prioritization**: Ensures critical tools are always available
- **Usage frequency analysis**: Learns from patterns of tool usage over time

## Tool Categories

Tools are organized into the following categories:

- **FILESYSTEM**: File and directory operations, search, and content management
- **CODE_EDITING**: Code modification and editing operations
- **VERSION_CONTROL**: Git and GitHub operations
- **MEMORY**: Knowledge graph and persistent storage functionality
- **TERMINAL**: Command execution and remote operations
- **AI**: Thinking, research, and generative capabilities

## API Reference

### `selectToolsForContext(availableTools, userContext, limit = 5)`

Selects the most relevant tools based on user context.

- **Parameters**:
  - `availableTools` (Array): List of available tools with their properties
  - `userContext` (String): User query or message
  - `limit` (Number, optional): Maximum number of tools to return (default: 5)
- **Returns**: Array of tool objects with relevance scores

### `recordToolUsage(toolId)`

Records a tool as being used, for future recommendations.

- **Parameters**:
  - `toolId` (String): The ID of the tool that was used
- **Returns**: void

### `getToolsByCategory(availableTools, category)`

Retrieves tools belonging to a specific category.

- **Parameters**:
  - `availableTools` (Array): List of available tools
  - `category` (String): Category name (FILESYSTEM, CODE_EDITING, etc.)
- **Returns**: Array of tool objects in the specified category

### `getToolRecommendations(recentQueries, availableTools, limit = 3)`

Generates tool recommendations based on recent user queries.

- **Parameters**:
  - `recentQueries` (Array): List of recent user queries
  - `availableTools` (Array): List of available tools
  - `limit` (Number, optional): Maximum number of recommendations (default: 3)
- **Returns**: Array of recommended tool objects

### `getMostFrequentlyUsedTools(availableTools, limit = 5)`

Returns tools that have been used most frequently.

- **Parameters**:
  - `availableTools` (Array): List of available tools
  - `limit` (Number, optional): Maximum number of tools to return (default: 5)
- **Returns**: Array of most frequently used tool objects

### `clearUsageHistory()`

Clears all usage history and counters.

- **Returns**: void

### `updateWeightFactors(newWeights)`

Updates the weight factors used in the scoring algorithm.

- **Parameters**:
  - `newWeights` (Object): Object with weight factors to update
- **Returns**: void

## Scoring Algorithm

The scoring algorithm considers multiple factors:

1. **Explicit Mention** (weight: 10): Direct mention of a tool in the user query
2. **Category Match** (weight: 5): Presence of category keywords in the user query
3. **Recent Usage** (weight: 3): Whether the tool has been used recently
4. **Essential Tools** (weight: 2): Baseline boost for critical tools
5. **Usage Frequency** (weight: 1): How often the tool has been used overall

## Usage Examples

```javascript
// Import the selector
import { 
  selectToolsForContext, 
  recordToolUsage, 
  getToolsByCategory 
} from './context-aware-selector.js';

// Get tools relevant to a user query
const userQuery = "I need to edit the README.md file";
const relevantTools = selectToolsForContext(availableTools, userQuery, 5);

// Record tool usage after a tool is used
recordToolUsage('edit_file');

// Get tools by category
const filesystemTools = getToolsByCategory(availableTools, 'FILESYSTEM');
```

## Integration with the Server

The context-aware selector is integrated into the Smart MCP Server through middleware that processes incoming requests and enriches them with relevant tool suggestions. This ensures that tools presented to AI assistants are contextually appropriate for the current task.

## Testing

The selector can be tested using the `test-context-aware-selector.js` script, which evaluates its performance across different user contexts and scenarios.

## Customization

The behavior of the context-aware selector can be customized by:

1. Modifying the `WEIGHT_FACTORS` to adjust the importance of different scoring components
2. Adding or removing tools from the `TOOL_CATEGORIES` to change categorization
3. Updating `CONTEXT_KEYWORDS` to improve category matching
4. Modifying the `ESSENTIAL_TOOLS` list to prioritize different tools

---
## 6. Freight & Logistics Integration (from docs/freight-logistics-integration.md)
# Freight and Logistics Integration Guide

This guide explains how to integrate the Smart MCP Server with freight and logistics operations using our comprehensive workflow system.

## Overview

The freight and logistics integration workflow automates the entire process of handling shipping documents, from EDI processing to route optimization and stakeholder notifications. It leverages multiple MCP tools to create a seamless, end-to-end solution.

## Features

- **EDI Document Processing**: Automated handling of common EDI documents (856, 204, 214, 990)
- **AI-Powered Data Extraction**: Uses Gemini AI to extract structured data from shipping documents
- **Route Optimization**: Integration with external routing services
- **Real-time Updates**: Automated notifications to all stakeholders
- **Document Archival**: Systematic storage of all shipping documents
- **Compliance**: Built-in validation and error handling
- **Monitoring**: Real-time metrics and SLA tracking

## Prerequisites

1. MCP Server setup with the following tools enabled:
   - EDI X12 Tool
   - Gemini Tool
   - REST API Tool
   - SQL Server Tool
   - AS2 Tool
   - Notification Tool
   - SharePoint Tool

2. Required API Keys and Credentials:
   - Routing API credentials
   - Database connection details
   - AS2 certificates and partner profiles
   - SharePoint credentials

3. Environment Variables:
   ```env
   ROUTING_API_ENDPOINT=https://your-routing-service.com/api
   ROUTING_API_KEY=your-api-key
   ADMIN_EMAIL=admin@your-company.com
   ```

---
## 7. Gemini API Integration (from docs/gemini-integration.md)
# Gemini API Integration

This document explains how to integrate and use Google's Gemini API with the smart-mcp-server.

## Overview

The Smart MCP Server integrates with Google's Gemini API to provide powerful generative AI capabilities. This integration enables:

- Text generation with various configurations
- JSON response formatting
- Streaming responses for real-time applications
- Mixed content handling

## Prerequisites

To use the Gemini API integration, you'll need:

1. A Google AI Studio account
2. A valid Gemini API key
3. Node.js v18 or later

## Setup

### 1. Get an API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create or sign in to your Google account
3. Generate an API key
4. Make sure your API key has access to the Gemini models you want to use

### 2. Configure Environment Variables

Create a `.env` file in the root of your project based on the `.env.example` template:

```bash
# Copy the example file
cp .env.example .env

# Edit with your favorite editor
nano .env
```

Update the following values:

```env
GEMINI_API_KEY=your-actual-api-key
GEMINI_MODEL=gemini-2.0-flash  # or another Gemini model
GEMINI_MAX_TOKENS=2048  # adjust based on your needs
GEMINI_TEMPERATURE=0.7  # 0.0 to 1.0, lower for more deterministic responses
GEMINI_TOP_P=0.9
GEMINI_TOP_K=40
```

### 3. Install Dependencies

```bash
npm install @google/generative-ai
```

## Available Models

The Gemini integration supports various models:

| Model | Description | Use Cases |
|-------|-------------|-----------|
| gemini-2.0-flash | Fast and efficient text generation | General text, code, chat |
| gemini-1.5-flash | Previous generation, still effective | Simpler text generation |
| gemini-1.5-pro | More powerful, handles complex tasks | Complex reasoning, planning |

## Usage Examples

### Basic Text Generation

```javascript
import { GeminiClient } from '../lib/gemini-client.js';

const client = new GeminiClient();
const result = await client.generateText("Explain JavaScript Promises");
console.log(result);
```

### JSON Generation

```javascript
import { GeminiClient } from '../lib/gemini-client.js';

const client = new GeminiClient({ temperature: 0.2 }); // Lower temperature for structured data
const prompt = `Generate a JSON object for a user profile with name, email, and age.
The response must be valid JSON with no other text.`;

const result = await client.generateJson(prompt);
console.log(result);
```

### Streaming Responses

```javascript
import { GeminiClient } from '../lib/gemini-client.js';

const client = new GeminiClient();
const stream = await client.generateStream("Explain quantum computing");

for await (const chunk of stream) {
  process.stdout.write(chunk); // Display each chunk as it arrives
}
```

## Handling Errors

The Gemini integration includes error handling for common issues:

- API key validation
- Rate limiting
- Model availability
- Response parsing errors

See the examples in `examples/gemini-response-types-example.js` for implementation details.

## Troubleshooting

If you encounter issues:

1. Verify your API key is valid and has the necessary permissions
2. Check you haven't exceeded your quota or rate limits
3. Try using a different Gemini model
4. Ensure your prompts follow Google's content policy
5. Check network connectivity and proxy settings

## Additional Resources

- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Gemini API Reference](https://ai.google.dev/api/rest/v1beta/models)
- [Content Guidelines](https://ai.google.dev/docs/content_guidelines)

---
## 8. Workflow Testing (from docs/workflow-testing.md)
# Workflow Testing System

This document provides guidance on using the Smart MCP Server's workflow testing system to test, monitor, and optimize your workflows.

## Overview

The workflow testing system allows you to:

1. Run workflows in both mock and real execution modes
2. Gather performance metrics and execution logs
3. Compare different workflow runs to identify optimizations
4. Test workflow reliability and error handling
5. Measure the impact of changes to workflow design

## Components

The system consists of these key components:

- **WorkflowTester** (`workflow-monitor.js`): A class that handles workflow execution, monitoring, and metrics gathering
- **Testing Workflow** (`examples/workflow-testing-workflow.json`): A workflow that tests other workflows
- **Example Scripts** (`examples/test-workflow.js`): Example implementation of workflow testing

## Quick Start

To get started with workflow testing:

1. Import the WorkflowTester class:

   ```javascript
   const { WorkflowTester } = require('./workflow-monitor');
   ```

2. Create a tester instance:

   ```javascript
   const tester = new WorkflowTester({
     logDirectory: './logs',
     metricsDirectory: './metrics',
     reportsDirectory: './reports'
   });
   ```

3. Load a workflow:

   ```javascript
   const workflow = tester.loadWorkflow('./examples/workflow-testing-workflow.json');
   ```

4. Execute the workflow:

   ```javascript
   const result = await tester.executeWorkflow(workflow, {
     // Optional inputs for the workflow
     targetWorkflow: 'my-workflow-to-test'
   });
   ```

5. Generate reports:

   ```javascript
   const report = tester.generateComparisonReport(['run_12345', 'run_67890']);
   ```

## Mock vs. Real Execution

The workflow tester supports two execution modes:

### Mock Mode

Useful for testing workflow structure, dependencies, and logic without actual tool execution:

```javascript
tester.config.mockMode = true;

// Register mock responses for tools
tester.registerMockResponse('web_search', {
  results: [
    { title: 'Mock Result', snippet: 'This is a mock result', url: 'https://example.com' }
  ]
});

// Execute with mock responses
await tester.executeWorkflow(workflow);
```

### Real Execution Mode

Runs workflows with actual tool execution:

```javascript
tester.config.mockMode = false;
await tester.executeWorkflow(workflow);
```

## Workflow Metrics

The system captures the following metrics for each workflow execution:

- **Total duration**: Time taken to execute the entire workflow
- **Step durations**: Time taken for each individual step
- **Error rate**: Percentage of steps that failed
- **Step dependencies**: Impact of dependencies on execution time
- **Concurrency efficiency**: How effectively parallelization was utilized

## Testing Strategies

### 1. Incremental Testing

Test individual steps first, then progressively add more steps as you validate each part of the workflow:

```javascript
// Test a subset of steps
const workflowSubset = {
  ...workflow,
  steps: workflow.steps.slice(0, 3) // Test first 3 steps
};
await tester.executeWorkflow(workflowSubset);
```

### 2. Dependency Testing

Focus on testing dependencies between steps to ensure proper data flow:

```javascript
// Register custom mocks for dependency testing
const mockData = { key: 'value' };
tester.registerMockResponse('step1_tool', mockData);

// Then test steps that depend on step1
const dependentSteps = workflow.steps.filter(step => 
  step.dependencies && step.dependencies.includes('step1')
);
```

### 3. Performance Testing

Run the workflow multiple times and compare results to identify performance issues:

```javascript
const results = [];
for (let i = 0; i < 5; i++) {
  results.push(await tester.executeWorkflow(workflow));
}

const comparison = tester.generateComparisonReport(
  results.map(r => r.testRunId)
);
```

### 4. Error Handling Testing

Test how your workflow handles failures:

```javascript
// Register a mock that simulates failure
tester.registerMockResponse('critical_tool', () => {
  throw new Error('Simulated failure');
});

// Execute workflow to test error handling
await tester.executeWorkflow(workflow);
```

## The Testing Workflow

The `workflow-testing-workflow.json` file provides a comprehensive workflow for testing other workflows. It includes steps for:

1. Analyzing workflow structure
2. Setting up test environments
3. Creating test cases
4. Setting up mock servers
5. Testing individual steps
6. Testing error handling
7. Measuring performance
8. Generating reports

## Reading Test Results

Test results are stored in three locations:

- **Logs**: `./logs/{testRunId}_steps.jsonl` - Detailed logs of each step execution
- **Metrics**: `./metrics/{testRunId}_metrics.json` - Performance metrics for the workflow
- **Reports**: `./reports/{reportName}.json` - Comparison reports across multiple runs

Example of reading metrics:

```javascript
const fs = require('fs');
const metrics = JSON.parse(
  fs.readFileSync(`./metrics/${testRunId}_metrics.json`, 'utf8')
);

console.log(`Total duration: ${metrics.totalDuration}ms`);
console.log(`Error rate: ${metrics.errorRate}%`);
```

## Best Practices

1. **Start with mock mode** to validate workflow structure before real execution
2. **Use specific test cases** that cover both happy paths and error conditions
3. **Test concurrency limits** to find the optimal settings for your workflow
4. **Implement proper error handling** in workflows to ensure resilience
5. **Compare before and after** when making changes to workflow design
6. **Establish performance baselines** to track improvements over time
7. **Test with varying inputs** to ensure workflow robustness

## Example Implementation

See `examples/test-workflow.js` for a complete example of how to use the workflow testing system.

```javascript
// Run the example
node examples/test-workflow.js
```

## Extending the System

You can extend the workflow testing system in several ways:

1. **Add custom metrics**: Modify the `generateMetrics` method to capture additional metrics
2. **Create specialized test harnesses**: Build on top of WorkflowTester for specific testing needs
3. **Integrate with CI/CD**: Automate workflow testing as part of your deployment pipeline

## Troubleshooting

### Common Issues

1. **"Dependency not satisfied" errors**: Check for circular dependencies or missing steps
2. **Timeouts**: Adjust the `timeoutMs` config value for long-running steps
3. **File access errors**: Ensure the log, metrics, and reports directories are writable

### Debugging Tips

1. Set up detailed logging:

   ```javascript
   const tester = new WorkflowTester({
     logDirectory: './detailed-logs',
     // Additional config...
   });
   ```

2. Examine step logs in the log directory for specific error messages

3. Use mock mode to isolate issues with specific tools or steps

---
## 9. Examples Guide (from examples/README.md)
# Smart MCP Server Examples

This directory contains example scripts that demonstrate various features and integrations of the Smart MCP Server.

## Gemini API Examples

### Setup

Before running the Gemini API examples, you need to:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the project root with your API key:

```env
GEMINI_API_KEY=your-api-key-here
```

Or set the environment variable before running the script:

```bash
# Windows PowerShell
$env:GEMINI_API_KEY = "your-api-key-here"

# Windows CMD
set GEMINI_API_KEY=your-api-key-here

# Linux/Mac
export GEMINI_API_KEY=your-api-key-here
```

### Example Scripts

#### Response Types Example

Demonstrates different types of responses from the Gemini API:

```bash
node examples/gemini-response-types-example.js
```

This example shows:

- Plain text responses
- JSON responses
- Streaming responses
- Mixed content with code examples

#### Basic Gemini Example

Simpler example showing basic Gemini functionality:

```bash
npm run gemini:example
```

## Workflow Examples

### Testing Individual Workflows

Test a specific workflow:

```bash
npm run workflow:test -- --id=your-workflow-id
```

### Workflow Monitoring

Monitor the status of all workflows:

```bash
npm run workflow:monitor
```

### Workflow Registration

Register a new workflow:

```bash
npm run workflow:example
```

## Context-Aware Selector Examples

### Testing Selector Logic

```bash
node test-context-aware-selector.js
```

## Database Integration Examples

### Testing Database Connectivity

```bash
node examples/test-database-integration.js
```

## Troubleshooting

If you encounter issues:

1. Verify your API keys are correct in the `.env` file
2. Check network connectivity
3. Make sure you have installed all dependencies with `npm install`
4. For Gemini API issues, verify your API key has access to the models used in examples

## Example Categories

### Core Examples

- **gemini-example.js**: Basic example showing how to use the Gemini API for text generation and chat.
- **gemini-advanced-example.js**: Advanced usage of Gemini models, including handling inline data and tool calling.
- **gemini-with-tools-example.js**: Example of using Gemini with tool calling capabilities to solve more complex tasks.
- **gemini-response-types-example.js**: Demonstrates configuring Gemini models for different response types.
- **gemini-basic-test.js**: A simple utility to test which Gemini models are available for your API key.

### Integration Examples

- **database-integration-workflow.json**: Workflow for integrating PostgreSQL with the MCP server.
- **workflow-example.json**: Example of a workflow configuration.
- **gemini-integration-workflow.json**: Workflow for integrating the Gemini API.

## Running Examples

Most examples can be run directly with Node.js:

```bash
# Make sure you've installed dependencies
npm install

# Set up your .env file with required API keys and configuration

# Run a specific example
node examples/gemini-example.js
```

## Required Environment Variables

For Gemini API examples:

- `GEMINI_API_KEY`: Your Google AI Studio API key

For database examples:

- `DATABASE_URL`: PostgreSQL connection string

See the `.env.example` file in the project root for more environment variables.

## Workflow Configuration

Workflow examples (JSON files) are not meant to be executed directly. They are configuration files that define workflows to be processed by the MCP server's workflow engine.

To use a workflow:

1. Start the MCP server
2. Upload or register the workflow
3. Trigger the workflow through the API

## Additional Resources

For more information, see the documentation in the `/docs` directory.

### Running Gemini Examples

To run the Gemini examples, you'll need to provide a valid Gemini API key:

```bash
# On Windows PowerShell
$env:GEMINI_API_KEY = "your-api-key"; node examples/gemini-basic-test.js

# On Linux/macOS
GEMINI_API_KEY="your-api-key" node examples/gemini-basic-test.js
```

The examples will create an `output` directory in the examples folder to store generated content when applicable.