import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'node:path';

import type { ReviewReport } from '../types/report-types.js';

export interface GeneratedReportPaths {
  json: string;
  markdown: string;
  html: string;
}

export class ReportGenerator {
  generateMarkdownReport(report: ReviewReport): string {
    const { summary, recommendations, fileReviews } = report;

    const formattedRecs = recommendations
      .slice(0, 5)
      .map((rec, idx) => {
        const emoji = {
          critical: '🚨',
          high: '⚠️',
          medium: '📝',
          low: '💡',
        }[rec.priority];

        return `${idx + 1}. ${emoji} **${rec.category}**: ${rec.description}
- Files: ${rec.files.join(', ')}`;
      })
      .join('\n\n');

    const formattedFiles = fileReviews
      .map((review) => {
        const { file, codeQuality, testCoverage, refactorings } = review;

        const issueList = codeQuality.issues
          .slice(0, 3)
          .map(
            (i) =>
              `  - Line ${i.line}: \`${i.severity}\` ${i.description}`
          )
          .join('\n');

        const testList = testCoverage.untestedPaths
          .slice(0, 2)
          .map(
            (p) =>
              `  - \`${p.location}\` (${p.priority} priority)`
          )
          .join('\n');

        const refactorList = refactorings.suggestions
          .slice(0, 2)
          .map(
            (s) =>
              `  - **${s.type}**: ${s.description}`
          )
          .join('\n');

        return `### 📄 \`${file}\`

**Quality Score:** ${codeQuality.overallScore}/100 | **Coverage:** ~${testCoverage.coverageEstimate}%

#### Issues (${codeQuality.issues.length})
${issueList || '  None found'}
${codeQuality.issues.length > 3 ? `\n  *...and ${codeQuality.issues.length - 3} more*` : ''}

#### Test Gaps (${testCoverage.untestedPaths.length})
${testList || '  None found'}
${testCoverage.untestedPaths.length > 2 ? `\n  *...and ${testCoverage.untestedPaths.length - 2} more*` : ''}

#### Refactoring Opportunities (${refactorings.suggestions.length})
${refactorList || '  None found'}
${refactorings.suggestions.length > 2 ? `\n  *...and ${refactorings.suggestions.length - 2} more*` : ''}`;
      })
      .join('\n\n---\n\n');

    return `# �� Code Review Report

## Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | ${summary.overallScore}/100 |
| **Files Reviewed** | ${summary.totalFiles} |
| **Critical Issues** | ${summary.criticalIssues} |
| **High Priority Tests** | ${summary.highPriorityTests} |
| **Refactoring Opportunities** | ${summary.refactoringOpportunities} |

## 🎯 Top Recommendations

${formattedRecs || 'No recommendations at this time.'}

## 📁 File Details

${formattedFiles || 'No file reviews available.'}

---

*Generated at ${report.metadata.analyzedAt} • Duration: ${report.metadata.duration}ms*
`;
  }

  generateHTMLReport(report: ReviewReport): string {
    const { summary, recommendations, fileReviews, metadata } = report;

    const recList = recommendations
      .slice(0, 5)
      .map(
        (r) => `
        <li class="rec-${r.priority}">
          <span class="priority">[${r.priority.toUpperCase()}]</span>
          <strong>${this.escapeHtml(r.category)}</strong>: ${this.escapeHtml(r.description)}
          <br><small>Files: ${r.files.map((f) => this.escapeHtml(f)).join(', ')}</small>
        </li>
      `
      )
      .join('');

    const fileList = fileReviews
      .map(
        (review) => `
        <section class="file-review">
          <h3>${this.escapeHtml(review.file)}</h3>
          <p>
            <strong>Quality:</strong> ${review.codeQuality.overallScore}/100
            &nbsp; | &nbsp;
            <strong>Coverage:</strong> ${review.testCoverage.coverageEstimate}%
          </p>
          <p><strong>Issues:</strong> ${review.codeQuality.issues.length}</p>
          <p><strong>Test gaps:</strong> ${review.testCoverage.untestedPaths.length}</p>
          <p><strong>Refactorings:</strong> ${review.refactorings.suggestions.length}</p>
        </section>
      `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Review Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
      background: #f8f9fa;
      color: #212529;
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 12px; }
    .summary {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    .metric { text-align: center; }
    .metric-value { font-size: 2em; font-weight: bold; color: #3498db; }
    .metric-label { color: #6c757d; font-size: 0.9em; }
    .file-review, li {
      background: white;
      padding: 16px;
      margin: 12px 0;
      border-radius: 6px;
    }
    ul { list-style: none; padding: 0; }
    .priority { font-weight: bold; margin-right: 8px; }
    footer { text-align: center; color: #6c757d; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>🔍 Code Review Report</h1>

  <div class="summary">
    <div class="metric">
      <div class="metric-value">${summary.overallScore}</div>
      <div class="metric-label">Overall Score</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.totalFiles}</div>
      <div class="metric-label">Files Reviewed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.criticalIssues}</div>
      <div class="metric-label">Critical Issues</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.highPriorityTests}</div>
      <div class="metric-label">Tests Needed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.refactoringOpportunities}</div>
      <div class="metric-label">Refactorings</div>
    </div>
  </div>

  <h2>🎯 Top Recommendations</h2>
  <ul>${recList || '<li>No recommendations at this time.</li>'}</ul>

  <h2>📁 File Reviews</h2>
  ${fileList || '<p>No file reviews available.</p>'}

  <footer>
    Generated at ${this.escapeHtml(metadata.analyzedAt)}
    • Duration: ${metadata.duration}ms
  </footer>
</body>
</html>`;
  }

  generateJSONReport(report: ReviewReport): string {
    return JSON.stringify(report, null, 2);
  }

  async saveReports(
    report: ReviewReport,
    outputDirectory = 'reports'
  ): Promise<GeneratedReportPaths> {
    mkdirSync(outputDirectory, { recursive: true });

    const baseName = `${this.sanitize(report.pullRequest.owner)}_${this.sanitize(
      report.pullRequest.repo
    )}_${report.pullRequest.number}`;

    const paths: GeneratedReportPaths = {
      json: join(outputDirectory, 'report.json'),
      markdown: join(outputDirectory, 'report.md'),
      html: join(outputDirectory, 'report.html'),
    };

    Promise.all([
      writeFileSync(paths.json, this.generateJSONReport(report), 'utf8'),
      writeFileSync(paths.markdown, this.generateMarkdownReport(report), 'utf8'),
      writeFileSync(paths.html, this.generateHTMLReport(report), 'utf8'),
    ]);

    return paths;
  }

  private sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
