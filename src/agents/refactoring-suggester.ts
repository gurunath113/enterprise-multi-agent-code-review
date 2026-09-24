import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { RefactoringSuggestionJSONSchema } from '../types/analysis-results.js';
import { refactoringSuggesterPrompt } from '../prompts/refactoring-suggester.prompt.js';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies safe and valuable refactoring opportunities that improve code structure, clarity, maintainability, and modernization.',

  prompt: refactoringSuggesterPrompt,

  tools: ['Read', 'Grep', 'Glob'],

  model: 'haiku',


};

