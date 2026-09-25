import 'dotenv/config';

import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';

interface CliArgs {
  owner: string;
  repo: string;
  prNumber: number;
}

function printUsage(): void {
  console.log(`
Enterprise Multi-Agent Code Review Orchestrator

Usage:
  npm run dev -- <owner> <repo> <pr-number>

Example:
  npm run dev -- airaamane simple-todo-app 1
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg.trim().length > 0);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (args.length !== 3) {
    throw new Error(
      'Expected exactly 3 arguments: <owner> <repo> <pr-number>'
    );
  }

  const [owner, repo, prValue] = args;
  const prNumber = Number(prValue);

  if (!owner || !repo) {
    throw new Error('Repository owner and repository name are required.');
  }

  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error('PR number must be a positive integer.');
  }

  return {
    owner,
    repo,
    prNumber,
  };
}

function validateEnvironment(): void {
  const model = process.env.ANTHROPIC_MODEL?.trim();

  if (!model) {
    throw new Error(
      'Missing required environment variable: ANTHROPIC_MODEL'
    );
  }

  const hasAnthropicAuth = Boolean(
    process.env.ANTHROPIC_API_KEY?.trim()
  );

  const hasAwsAuth = Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
    process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );

  if (!hasAnthropicAuth && !hasAwsAuth) {
    throw new Error(
      'Authentication required: set ANTHROPIC_API_KEY or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.'
    );
  }

  if (!process.env.GITHUB_TOKEN?.trim()) {
    throw new Error(
      'Missing required environment variable: GITHUB_TOKEN'
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  validateEnvironment();

  console.log(
    `Starting code review for ${args.owner}/${args.repo}#${args.prNumber}...`
  );

  const orchestrator = new CodeReviewOrchestrator();

  const report = await orchestrator.reviewPullRequest(
    args.owner,
    args.repo,
    args.prNumber
  );

  const generator = new ReportGenerator();

  const paths = await generator.saveReports(report);

  console.log('\nReview completed successfully.');
  console.log(`JSON report: ${paths.json}`);
  console.log(`Markdown report: ${paths.markdown}`);
  console.log(`HTML report: ${paths.html}`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error(`\nReview failed: ${message}`);
  process.exitCode = 1;
});
