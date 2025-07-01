import ModelDriverFactory from '../../models/ModelDriverFactory.js';
import logger from '../../logger.js';

/**
 * Enhanced NLP Workflow Creator that converts natural language descriptions
 * into structured workflow configurations using AI models.
 */
class NlpWorkflowCreator {
    constructor() {
        this.modelDriver = ModelDriverFactory.create();
        this.maxRetries = 3;
        this.temperature = 0.3; // Lower temperature for more consistent JSON output
    }

    /**
     * Creates a workflow from natural language text description
     * @param {string} text - Natural language description of the workflow
     * @param {Object} options - Optional configuration
     * @param {string} options.workflowType - Type of workflow to generate (e.g., 'data-processing', 'api-integration')
     * @param {Object} options.constraints - Constraints for the workflow generation
     * @param {boolean} options.validate - Whether to validate the generated workflow
     * @returns {Promise<Object|null>} Generated workflow object or null if failed
     */
    async createFromText(text, options = {}) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            logger.warn('Invalid input text provided to NLP workflow creator');
            return null;
        }

        const {
            workflowType = 'general',
            constraints = {},
            validate = true
        } = options;

        logger.info(`Generating ${workflowType} workflow from text`, { textLength: text.length });

        const prompt = this._buildPrompt(text, workflowType, constraints);
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger.debug(`Workflow generation attempt ${attempt}/${this.maxRetries}`);
                
                const response = await this.modelDriver.generate({
                    prompt,
                    temperature: this.temperature,
                    maxTokens: 2048
                });

                const workflow = this._parseWorkflowResponse(response.text);
                
                if (workflow && (!validate || this._validateWorkflow(workflow))) {
                    logger.info('Successfully generated workflow', { 
                        workflowType: workflow.type || 'unknown',
                        stepCount: workflow.steps?.length || 0
                    });
                    return workflow;
                }
                
                logger.warn(`Generated workflow failed validation on attempt ${attempt}`);
                
            } catch (error) {
                logger.error(`Workflow generation attempt ${attempt} failed`, error);
                
                if (attempt === this.maxRetries) {
                    logger.error('All workflow generation attempts failed');
                    return null;
                }
                
                // Brief delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }

        return null;
    }

    /**
     * Generates multiple workflow variations from the same text
     * @param {string} text - Natural language description
     * @param {number} count - Number of variations to generate
     * @param {Object} options - Generation options
     * @returns {Promise<Array<Object>>} Array of generated workflows
     */
    async createVariations(text, count = 3, options = {}) {
        logger.info(`Generating ${count} workflow variations`);
        
        const variations = [];
        const promises = [];
        
        for (let i = 0; i < count; i++) {
            const variationOptions = {
                ...options,
                temperature: this.temperature + (i * 0.1) // Slight temperature variation
            };
            
            promises.push(this.createFromText(text, variationOptions));
        }
        
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                variations.push({
                    ...result.value,
                    variationId: index + 1
                });
            }
        });
        
        logger.info(`Generated ${variations.length}/${count} workflow variations`);
        return variations;
    }

    /**
     * Builds the AI prompt for workflow generation
     * @private
     */
    _buildPrompt(text, workflowType, constraints) {
        const basePrompt = `You are an expert workflow designer. Convert the following natural language description into a valid JSON workflow configuration.

Description: "${text}"

Workflow Type: ${workflowType}

Requirements:
- Generate a complete, executable workflow in JSON format
- Include proper error handling and validation steps
- Use descriptive names for steps and variables
- Include metadata like description, version, and tags
- Ensure the workflow is logically structured and follows best practices

${Object.keys(constraints).length > 0 ? `Additional Constraints: ${JSON.stringify(constraints, null, 2)}` : ''}

Expected JSON structure:
{
  "name": "workflow-name",
  "description": "Brief description",
  "version": "1.0.0",
  "type": "${workflowType}",
  "metadata": {
    "tags": ["tag1", "tag2"],
    "author": "nlp-creator",
    "created": "ISO-date-string"
  },
  "variables": {},
  "steps": [
    {
      "id": "step-1",
      "name": "Step Name",
      "type": "action-type",
      "config": {},
      "onSuccess": "next-step-id",
      "onError": "error-handler-id"
    }
  ],
  "errorHandlers": []
}

Return only the JSON object, no additional text or formatting.`;

        return basePrompt;
    }

    /**
     * Parses and cleans the AI response to extract valid JSON
     * @private
     */
    _parseWorkflowResponse(responseText) {
        if (!responseText) {
            logger.warn('Empty response from AI model');
            return null;
        }

        // Clean the response - remove markdown code blocks, extra whitespace
        let cleanedResponse = responseText.trim();
        
        // Remove markdown code block markers
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '');
        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
        
        // Find JSON object boundaries
        const jsonStart = cleanedResponse.indexOf('{');
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            logger.warn('No valid JSON object found in AI response');
            return null;
        }
        
        const jsonString = cleanedResponse.substring(jsonStart, jsonEnd + 1);
        
        try {
            const workflow = JSON.parse(jsonString);
            
            // Add generated timestamp if not present
            if (!workflow.metadata) {
                workflow.metadata = {};
            }
            if (!workflow.metadata.created) {
                workflow.metadata.created = new Date().toISOString();
            }
            
            return workflow;
        } catch (error) {
            logger.error('Failed to parse workflow JSON', { error: error.message, jsonString });
            return null;
        }
    }

    /**
     * Validates the generated workflow structure
     * @private
     */
    _validateWorkflow(workflow) {
        if (!workflow || typeof workflow !== 'object') {
            logger.warn('Workflow is not a valid object');
            return false;
        }

        const requiredFields = ['name', 'steps'];
        for (const field of requiredFields) {
            if (!workflow[field]) {
                logger.warn(`Workflow missing required field: ${field}`);
                return false;
            }
        }

        if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
            logger.warn('Workflow must have at least one step');
            return false;
        }

        // Validate each step has required fields
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            if (!step.id || !step.name || !step.type) {
                logger.warn(`Step ${i} missing required fields (id, name, type)`);
                return false;
            }
        }

        return true;
    }

    /**
     * Gets the current model driver information
     * @returns {Object} Model driver info
     */
    getModelInfo() {
        return {
            driverName: this.modelDriver.name,
            temperature: this.temperature,
            maxRetries: this.maxRetries
        };
    }
}

export default NlpWorkflowCreator;