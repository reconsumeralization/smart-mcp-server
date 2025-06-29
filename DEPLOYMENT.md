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