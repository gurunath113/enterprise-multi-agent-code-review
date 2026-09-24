import { describe, expect, it } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
} from '../src/types/index.js';

describe('Analysis schemas', () => {
  it('validates a code quality result', () => {
    const result = CodeQualityResultSchema.parse({
      file: 'src/example.ts',
      issues: [
        {
          line: 10,
          severity: 'medium',
          category: 'maintainability',
          description: 'Example issue',
          suggestion: 'Improve the implementation',
        },
      ],
      overallScore: 85,
      summary: 'Good overall quality',
    });

    expect(result.file).toBe('src/example.ts');
    expect(result.overallScore).toBe(85);
  });

  it('validates a test coverage result', () => {
    const result = TestCoverageResultSchema.parse({
      file: 'src/example.ts',
      hasTests: true,
      testFiles: ['tests/example.test.ts'],
      untestedPaths: [
        {
          type: 'edge-case',
          location: 'example() empty input',
          priority: 'high',
          reasoning: 'Empty input is not covered',
          suggestedTest: 'Add an empty-input test',
        },
      ],
      coverageEstimate: 80,
      summary: 'Some edge cases need coverage',
    });

    expect(result.hasTests).toBe(true);
    expect(result.coverageEstimate).toBe(80);
  });

  it('validates a refactoring suggestion', () => {
    const result = RefactoringSuggestionSchema.parse({
      file: 'src/example.ts',
      suggestions: [
        {
          type: 'extract-function',
          location: 'lines 10-25',
          impact: 'medium',
          description: 'Extract repeated logic',
          before: 'Repeated implementation',
          after: 'Shared helper function',
          benefits: 'Improves readability and reuse',
        },
      ],
      summary: 'One refactoring opportunity identified',
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].type).toBe('extract-function');
  });

  it('validates a complete review report', () => {
    const report = {
      pullRequest: {
        owner: 'airaamane',
        repo: 'simple-todo-app',
        number: 1,
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 100,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0,
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 100,
        agentVersions: {
          'code-quality-analyzer': '1.0.0',
          'test-coverage-analyzer': '1.0.0',
          'refactoring-suggester': '1.0.0',
        },
      },
    };

    expect(ReviewReportSchema.parse(report)).toEqual(report);
  });

  it('rejects an invalid quality score', () => {
    expect(() =>
      CodeQualityResultSchema.parse({
        file: 'src/example.ts',
        issues: [],
        overallScore: 101,
        summary: 'Invalid score',
      })
    ).toThrow();
  });
});
