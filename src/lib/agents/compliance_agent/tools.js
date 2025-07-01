import fs from 'fs/promises';
import path from 'path';
import logger from '../../../logger.js';

const complianceDocPath = path.resolve(
  process.cwd(),
  'docs/compliance/stripe_services_and_policies.md'
);

export async function readComplianceDocumentation() {
  try {
    const content = await fs.readFile(complianceDocPath, 'utf-8');
    return content;
  } catch (error) {
    logger.error('Error reading compliance documentation:', { error });
    return 'Error: Could not read compliance documentation.';
  }
}
