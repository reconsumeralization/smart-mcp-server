export default class CustomError extends Error {
  constructor (message, status = 400) {
    super(message);
    this.name = 'CustomError';
    this.status = status;
  }
} 