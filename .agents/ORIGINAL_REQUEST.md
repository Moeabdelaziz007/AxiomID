# Original User Request

## Initial Request — 2026-06-18T22:55:54+03:00

Deep expert-level code review, security audit, and compatibility assessment of all open and draft Pull Requests in the AxiomID repository to determine their merge readiness.

Working directory: /Users/cryptojoker710/Desktop/AxiomID
Integrity mode: demo

## Requirements

### R1. Comprehensive Branch Checkout & Analysis
The team must check out each of the 6 PR branches (PR 58, 59, 64, 65, 66, 67) locally. For each branch, perform a comprehensive static code analysis of the diff relative to the `main` branch.

### R2. Local Compilation & Verification Testing
For each checked-out branch, run local validation commands (e.g., `npm run build`, `npm run lint`, and any relevant unit/integration tests). Any compilation, typecheck, or linting failures must be captured to justify the PR score.

### R3. Expert Scoring & Recommendations
For each PR, calculate a rating score on a 1-10 scale and make a definitive recommendation: either "GOOD FOR MERGE" or "BAD FOR MERGE". The justification must highlight:
- Code health & complexity
- Security issues (vulnerabilities, input sanitization, data leaks)
- Compatibility and regressions

### R4. Automated Posting of PR Comments
Use the GitHub CLI (`gh` command) to post the complete review report directly onto each of the 6 PRs.

## Acceptance Criteria

### PR Comments Verification
- [ ] PR 58 has a posted review comment containing a 1-10 score and a clear GOOD/BAD recommendation.
- [ ] PR 59 has a posted review comment containing a 1-10 score and a clear GOOD/BAD recommendation.
- [ ] PR 64 has a posted review comment containing a 1-10 score and a clear GOOD/BAD recommendation.
- [ ] PR 65 has a posted review comment containing a 1-10 score and a clear GOOD/BAD recommendation.
- [ ] PR 66 has a posted review comment containing a 1-10 score and a clear GOOD/BAD recommendation.
- [ ] PR 67 has a posted review comment containing a 1-10 score and a clear GOOD/BAD recommendation.

### Local Test Verification
- [ ] Every branch checkout and its build status/errors are documented in the final execution log.

## Follow-up — 2026-06-18T19:58:00Z

CRITICAL CONSTRAINT FROM USER: This is a READ-ONLY review task. Do NOT make any code changes, edits, or modifications to any files in the repository. The team must ONLY:

1. Check out branches to read and analyze the diffs
2. Run build/lint/test commands to observe results (read-only verification)
3. Post review comments on the GitHub PRs via `gh pr comment`

Absolutely NO code edits, NO commits, NO pushes, NO file modifications. Review and report only. Pass this constraint to the Project Orchestrator and all sub-agents immediately.
