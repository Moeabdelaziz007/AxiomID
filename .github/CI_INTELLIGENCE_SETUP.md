# CI Intelligence Agent Setup

## Overview

The **Amrikky CI Intelligence Agent** is a GitHub App that performs autonomous security analysis, architecture validation, and code quality review on Pull Requests. It indexes code changes into Cloudflare Vectorize for semantic search and anomaly detection.

## Setup Steps

### 1. Install the GitHub App

1. Go to https://github.com/apps/amrikky-ci-intelligence-agent
2. Click **Install**
3. Select the **Moeabdelaziz007/AxiomID** repository
4. Grant **Read & Write** permissions for:
   - Pull Requests (to post comments)
   - Contents (to read code)
   - Checks (to create check runs)

### 2. Add Cloudflare Secrets

The Vectorize indexing requires Cloudflare API credentials. Add these as GitHub repository secrets:

```bash
# Via GitHub CLI
gh secret set CF_ACCOUNT_ID --repo Moeabdelaziz007/AxiomID
# Enter your Cloudflare Account ID when prompted

gh secret set CF_API_TOKEN --repo Moeabdelaziz007/AxiomID
# Enter your Cloudflare API Token when prompted
```

**How to find your Cloudflare Account ID:**
1. Log in to https://dash.cloudflare.com
2. Select any domain or go to the right sidebar
3. Copy the **Account ID** from the API section

**How to create a Cloudflare API Token:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template
4. Scope it to your account and the `AxiomID` zone (if applicable)
5. Copy the token

### 3. Create Vectorize Index

The CI agent needs a Vectorize index to store code embeddings:

```bash
cd backend

# Create the index (768 dimensions for bge-base-en-v1.5)
npx wrangler vectorize create ci-code-vectors --dimensions 768 --metric cosine
```

**Note:** If you want to use a different index name, set the `VECTORIZE_INDEX` repository variable:
```bash
gh variable set VECTORIZE_INDEX --repo Moeabdelaziz007/AxiomID --body "your-index-name"
```

### 4. Verify Setup

After installation, open a Pull Request. The CI Intelligence workflow should:
1. ✅ Run the anomaly detection (always works)
2. ✅ Index changes to Vectorize (if secrets are configured)
3. ✅ Post a summary to the PR step summary

Check the Actions tab for the "CI Intelligence Agent" workflow.

## What It Does

| Feature | Description |
|---------|-------------|
| **Anomaly Detection** | Flags large PRs (>500 lines), security-sensitive file changes, and large scope (>20 files) |
| **Vectorize Indexing** | Generates 768-d embeddings of changed files using Workers AI (bge-base-en-v1.5) |
| **Knowledge Base** | Indexes merged changes on `main` for historical context |
| **Step Summary** | Posts a formatted report to the GitHub Actions step summary |

## Troubleshooting

**Workflow doesn't run:**
- Ensure the app is installed on the repo
- Check that the workflow file exists at `.github/workflows/ci-intelligence.yml`

**Vectorize indexing skipped:**
- Check that `CF_ACCOUNT_ID` and `CF_API_TOKEN` secrets are set
- Verify the API token has Workers AI and Vectorize permissions

**Vectorize insert fails:**
- Ensure the `ci-code-vectors` index exists
- Check the Cloudflare dashboard for rate limits

## Architecture

```
PR Opened/Updated
    │
    ├──► Get PR diff (gh pr diff)
    │
    ├──► Extract file changes (csplit + python)
    │
    ├──► Detect anomalies (size, security, scope)
    │
    ├──► Index to Vectorize
    │       ├── Workers AI: bge-base-en-v1.5 (768-d)
    │       └── Vectorize: ci-code-vectors index
    │
    └──► Post summary (GITHUB_STEP_SUMMARY)
```
