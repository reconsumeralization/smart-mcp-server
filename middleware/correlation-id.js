import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

const asyncLocalStorage = new AsyncLocalStorage();

export const storage = asyncLocalStorage;

export function correlationIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId; 
  res.setHeader('X-Request-Id', requestId);

  asyncLocalStorage.run({ requestId }, () => {
    next();
  });
} 