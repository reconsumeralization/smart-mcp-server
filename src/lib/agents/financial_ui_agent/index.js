import geminiClient from '../../gemini-client.js';
import { getSystemPrompt } from './prompts.js';

/**
 * Generates interactive UI content based on user interaction history.
 *
 * @param {object[]} history - A list of user interaction objects.
 * @returns {Promise<string>} The generated HTML content for the UI.
 */
export async function generateFinancialUI(history = []) {
  const maxHistoryLength = 10; // Limit the number of interactions sent for context
  const systemPrompt = getSystemPrompt(maxHistoryLength);

  const chat = geminiClient.startChat({
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemPrompt }],
    },
    history: [], // History will be managed manually for this agent
  });

  // Format the history for the model
  const messages = history.slice(0, maxHistoryLength).map((interaction) => {
    return {
      role: 'user',
      parts: [{ text: `User action: ${interaction.id}` }],
    };
  });

  // The last message should be the most recent user action
  const lastMessage =
    messages.length > 0
      ? messages.pop().parts[0].text
      : 'Generate the initial dashboard view.';

  // Pass the rest of the history to the chat
  chat.history = messages.map((msg) => ({
    role: msg.role,
    parts: msg.parts,
  }));

  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
} 