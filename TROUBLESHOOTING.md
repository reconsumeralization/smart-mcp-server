# Troubleshooting Guide

This guide provides solutions to common problems you might encounter while setting up or running the Smart MCP Server.

---

## 1. Installation & Setup Issues

### Error: `Error: Cannot find module '@google/generative-ai'`

- **Cause:** Dependencies were not installed correctly.
- **Solution:** Run `npm install` in the project root to ensure all required packages are installed.

### Error: `GEMINI_API_KEY is not set`

- **Cause:** The Google Gemini API key has not been provided as an environment variable.
- **Solution:**
    1. Create a `.env` file in the project root. You can copy the `.env.example` file if it exists.
    2. Add the following line to your `.env` file, replacing `your_api_key_here` with your actual key:
       ```
       GEMINI_API_KEY=your_api_key_here
       ```
    3. Restart the server.

### Error: `EADDRINUSE: address already in use :::3000`

- **Cause:** Another process is already running on the port the server is trying to use (default is 3000).
- **Solution:**
    - Stop the other process, or
    - Change the port for this server by setting the `PORT` variable in your `.env` file:
      ```
      PORT=3001
      ```

---

## 2. Workflow Execution Issues

### Error: `Tool not found: [tool_name]. No internal handler is registered.`

- **Cause:** A workflow is trying to use a tool that hasn't been correctly registered in the `tool-proxy.js` file.
- **Solution:**
    1. Verify that the tool file exists in the `/tools` directory.
    2. Open `tool-proxy.js`.
    3. Ensure the tool is imported correctly at the top of the file.
    4. Ensure there is a `registerInternalTool('tool_name', handler_function)` call for the tool. The name must match exactly.

### Workflow fails with `status: 'failed'` but no clear error

- **Cause:** This can happen if an error is thrown inside a tool's execution but not properly caught or logged.
- **Solution:**
    1. Check the server console logs for more detailed error messages and stack traces.
    2. Add more detailed logging within the specific tool that is failing to trace its execution flow.
    3. Ensure the tool's implementation includes a `try...catch` block that returns a structured error object.

### Error: `Stripe API Error: Authentication required`

- **Cause:** The Stripe secret key is missing or invalid.
- **Solution:**
    1. Ensure `STRIPE_SECRET_KEY` is set correctly in your `.env` file.
    2. Verify the key is correct and has the necessary permissions in your Stripe Dashboard.

---

## 3. A2A Communication Issues

### Response: `404 Not Found` when posting to `/a2a/tasks`

- **Cause:** The A2A endpoint might not be correctly registered in the server.
- **Solution:**
    1. Check `server.js` to ensure the Express routes for `/a2a/tasks` are correctly defined.
    2. Verify you are posting to the correct port.

### Response: `No suitable workflow found for the given task`

- **Cause:** Gemini was unable to match your task description to any of the available workflows.
- **Solution:**
    1. Make your `task_description` more specific and clear.
    2. Check the `description` fields in your workflow `.json` files. They should accurately and clearly describe what the workflow does, as this is what Gemini uses for matching.
    3. Ensure the relevant workflow `.json` file is present in the `/examples` directory and is being loaded by the server on startup. 