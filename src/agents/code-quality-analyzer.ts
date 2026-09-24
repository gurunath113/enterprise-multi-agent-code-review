import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CodeQualityResultJSONSchema } from '../types/analysis-results.js';
import { codeQualityAnalyzerPrompt } from '../prompts/code-quality-analyzer.prompt.js';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes pull request code for security vulnerabilities, performance issues, maintainability problems, bugs, style issues, and best-practice violations.',

  prompt: codeQualityAnalyzerPrompt,

  tools: ['Skill', 'Read', 'Grep', 'Glob'],

  model: 'haiku',

  // Load skills from this project and make the Skill tool available.

};
