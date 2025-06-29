// This file will contain the core logic for the compliance agent.
// It will be responsible for orchestrating the prompts, tools, and the language model.

import { readComplianceDocumentation } from './tools.js';
import { compliancePrompt } from './prompts.js';

// A simple keyword-based search to find relevant sections.
// This is a placeholder for a more sophisticated semantic search with an LLM.
async function findRelevantSections(documentation, question) {
  const sections = documentation.split('##');
  const keywords = question.toLowerCase().split(/\s+/).filter(kw => kw.length > 2);
  const relevantSections = sections.filter(section => {
    const sectionLower = section.toLowerCase();
    return keywords.some(kw => sectionLower.includes(kw));
  });

  if (relevantSections.length > 0) {
    return relevantSections.join('\n---\n');
  }

  return "No specific sections found. Please review the full documentation.";
}

export async function queryCompliance(question) {
  const documentation = await readComplianceDocumentation();

  if (documentation.startsWith('Error:')) {
    return {
      answer: "Could not retrieve compliance information at this time.",
      sources: [],
    };
  }

  const answer = await findRelevantSections(documentation, question);

  return {
    answer: answer,
    sources: ['docs/compliance/stripe_services_and_policies.md'],
  };
} 