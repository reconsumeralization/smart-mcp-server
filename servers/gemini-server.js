/**
 * Gemini Server
 * 
 * Express server that provides an API for Gemini functionality,
 * handling text generation, chat, and other capabilities.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import geminiTool from '../tools/gemini-tool.js';
import logger from '../logger.js';

// Initialize express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

app.use(rateLimiter);

// Validate Gemini configuration
let isGeminiReady = false;

async function checkGeminiConfig() {
  try {
    const initialized = await geminiTool.initializeTool();
    isGeminiReady = initialized;
    
    if (isGeminiReady) {
      logger.info('Gemini server ready with valid configuration');
    } else {
      logger.error('Gemini server started but configuration is invalid');
    }
  } catch (error) {
    logger.error('Error initializing Gemini server:', error);
    isGeminiReady = false;
  }
}

// Middleware to check if Gemini is ready
function requireGeminiReady(req, res, next) {
  if (!isGeminiReady) {
    return res.status(503).json({
      error: 'Gemini service unavailable',
      message: 'Gemini API is not configured correctly or initialization failed'
    });
  }
  next();
}

// Server health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: isGeminiReady ? 'ready' : 'not_ready',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Initialize server health check
app.get('/api/initialize', async (req, res) => {
  try {
    await checkGeminiConfig();
    res.json({
      success: isGeminiReady,
      status: isGeminiReady ? 'ready' : 'not_ready'
    });
  } catch (error) {
    logger.error('Initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Gemini service'
    });
  }
});

// Generate text endpoint
app.post('/api/generate', requireGeminiReady, async (req, res) => {
  try {
    const result = await geminiTool.generateText(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error in generate text endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate text'
    });
  }
});

// Create chat session endpoint
app.post('/api/chat/session', requireGeminiReady, async (req, res) => {
  try {
    const result = await geminiTool.createChatSession(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create chat session'
    });
  }
});

// Send chat message endpoint
app.post('/api/chat/message', requireGeminiReady, async (req, res) => {
  try {
    const result = await geminiTool.sendChatMessage(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send chat message'
    });
  }
});

// Get chat history endpoint
app.get('/api/chat/history/:sessionId', requireGeminiReady, async (req, res) => {
  try {
    const result = await geminiTool.getChatHistory({
      sessionId: req.params.sessionId
    });
    res.json(result);
  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chat history'
    });
  }
});

// Generate content with images endpoint
app.post('/api/generate/images', requireGeminiReady, async (req, res) => {
  try {
    const result = await geminiTool.generateWithImages(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error generating content with images:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate content with images'
    });
  }
});

// Generate embeddings endpoint
app.post('/api/embed', requireGeminiReady, async (req, res) => {
  try {
    const result = await geminiTool.generateEmbedding(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error generating embedding:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate embedding'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start the server
async function startServer() {
  // Check configuration on startup
  await checkGeminiConfig();
  
  const port = process.env.GEMINI_SERVER_PORT || 3006;
  app.listen(port, () => {
    logger.info(`Gemini server running on port ${port}`);
  });
}

// Start server when this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(err => {
    logger.error('Failed to start Gemini server:', err);
    process.exit(1);
  });
}

export default app; 