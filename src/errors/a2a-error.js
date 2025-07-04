class A2AError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.name = 'A2AError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export default A2AError; 