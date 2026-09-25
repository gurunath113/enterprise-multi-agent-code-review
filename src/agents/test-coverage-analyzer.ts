import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TestCoverageResultJSONSchema } from '../types/analysis-results.js';
import { testCoverageAnalyzerPrompt } from '../prompts/test-coverage-analyzer.prompt.js';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Analyzes source code and related test files to estimate test coverage, identify untested paths, and suggest specific actionable tests.',

  prompt: testCoverageAnalyzerPrompt,

  tools: ['Skill', 'Read', 'Grep', 'Glob'],

  model: 'inherit',


};
