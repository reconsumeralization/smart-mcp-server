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