class WorkflowError extends Error {
  constructor(message, workflowName, executionId) {
    super(message);
    this.name = 'WorkflowError';
    this.workflowName = workflowName;
    this.executionId = executionId;
  }
}

export default WorkflowError; 