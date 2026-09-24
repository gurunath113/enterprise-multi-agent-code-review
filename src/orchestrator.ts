import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { mcpServersConfig } from './config/mcp.config.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester,
} from './agents/index.js';
import { orchestratorPrompt } from './prompts/index.js';
import {
  ReviewReportSchema,
  ReviewReportJSONSchema,
  type ReviewReport,
} from './types/index.js';
import { RateLimiter } from './utils/rate-limiter.js';

export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
  rateLimiter?: RateLimiter;
}

const agents = {
  'code-quality-analyzer': codeQualityAnalyzer,
  'test-coverage-analyzer': testCoverageAnalyzer,
  'refactoring-suggester': refactoringSuggester,
};

export class CodeReviewOrchestrator {
  private readonly model: string;
  private readonly maxTurns: number;
  private readonly rateLimiter: RateLimiter;

  constructor(options: OrchestratorOptions = {}) {
    this.model =
      options.model ||
      process.env.ANTHROPIC_MODEL ||
      'claude-sonnet-4-5-20250929';

    this.maxTurns = options.maxTurns ?? 20;
    this.rateLimiter = options.rateLimiter ?? new RateLimiter();
  }

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    if (!owner.trim()) {
      throw new Error('Repository owner is required.');
    }

    if (!repo.trim()) {
      throw new Error('Repository name is required.');
    }

    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      throw new Error('Pull request number must be a positive integer.');
    }

    const startedAt = Date.now();

    const prompt = `${orchestratorPrompt}

TARGET PULL REQUEST:
Owner: ${owner}
Repository: ${repo}
Pull Request Number: ${prNumber}

Begin by fetching the pull request data from GitHub using the GitHub MCP tools.

Then explicitly invoke all three specialized agents:
- code-quality-analyzer
- test-coverage-analyzer
- refactoring-suggester

Invoke independent analyses in parallel when possible.

Finally aggregate their results into the ReviewReport schema.`;

    await this.rateLimiter.acquire(5000);

    try {
      for await (const message of query({
        prompt,
        options: {
          model: this.model,
          allowedTools: [
            'Task',
            'mcp__github__*',
            'mcp__eslint__*',
          ],
          agents,
          mcpServers: mcpServersConfig,
          maxTurns: this.maxTurns,
          permissionMode: 'acceptEdits',
          settingSources: ['project'],
          outputFormat: {
            type: 'json_schema',
            schema: ReviewReportJSONSchema,
          },
        },
      })) {
        if (
          message.type === 'result' &&
          message.subtype === 'success' &&
          message.structured_output
        ) {
          const parsed = ReviewReportSchema.safeParse(
            message.structured_output
          );

          if (!parsed.success) {
            throw new Error(
              `Review report failed schema validation: ${parsed.error.message}`
            );
          }

          const result = parsed.data;

          return {
            ...result,
            pullRequest: {
              owner,
              repo,
              number: prNumber,
            },
            metadata: {
              ...result.metadata,
              analyzedAt:
                result.metadata?.analyzedAt || new Date().toISOString(),
              duration: Date.now() - startedAt,
            },
          };
        }

        if (message.type === 'result') {
          throw new Error(
            `Code review failed: ${message.subtype}`
          );
        }
      }

      throw new Error('Code review did not produce a structured result.');
    } finally {
      this.rateLimiter.release();
    }
  }
}
