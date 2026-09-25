import { describe, expect, it } from 'vitest';
import { CodeReviewOrchestrator } from '../src/orchestrator.js';

describe('CodeReviewOrchestrator', () => {
  describe('Configuration', () => {
    it('should initialize with default options', () => {
      const orchestrator = new CodeReviewOrchestrator();
      expect(orchestrator).toBeInstanceOf(CodeReviewOrchestrator);
    });

    it('should accept custom model and maxTurns options', () => {
      const orchestrator = new CodeReviewOrchestrator({
        model: 'test-model',
        maxTurns: 5,
      });
      expect(orchestrator).toBeInstanceOf(CodeReviewOrchestrator);
    });
  });

  describe('reviewPullRequest validation', () => {
    it('should reject an empty repository owner', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      await expect(
        orchestrator.reviewPullRequest('', 'repo', 1)
      ).rejects.toThrow('Repository owner is required.');
    });

    it('should reject an empty repository name', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      await expect(
        orchestrator.reviewPullRequest('owner', '', 1)
      ).rejects.toThrow('Repository name is required.');
    });

    it('should reject an invalid pull request number', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      await expect(
        orchestrator.reviewPullRequest('owner', 'repo', 0)
      ).rejects.toThrow('Pull request number must be a positive integer.');
    });

    it('should reject a non-integer pull request number', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      await expect(
        orchestrator.reviewPullRequest('owner', 'repo', 1.5)
      ).rejects.toThrow('Pull request number must be a positive integer.');
    });
  });

  describe('Integration', () => {
    it.skip('should review a real small public PR', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      const report = await orchestrator.reviewPullRequest(
        'airaamane',
        'simple-todo-app',
        1
      );

      expect(report.pullRequest.owner).toBe('airaamane');
      expect(report.pullRequest.repo).toBe('simple-todo-app');
      expect(report.pullRequest.number).toBe(1);
    });
  });
});
