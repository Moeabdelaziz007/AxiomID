#!/usr/bin/env python3
"""Classify changed files into CI lanes for PAI Universe repos.

Reads newline-separated changed paths on stdin and writes key=value
booleans to $GITHUB_OUTPUT and stdout.
"""

import json
import os
import sys

# PAI Universe Path Patterns

NODE_PKG = ("package.json",)
NEXTJS = ("next.config.", "src/app/", "src/pages/", "public/", "next-env.d.ts", "app/", "pages/")
CF_WORKERS = ("wrangler.jsonc", "wrangler.toml", "wrangler.yaml", "src/worker.ts", "src/index.ts", "worker.ts")
MONOREPO = ("turbo.json", "pnpm-workspace.yaml", "pnpm-workspace.yml", "packages/")
DOCS = ("README", "docs/", "doc/", ".md", "CHANGELOG", "CONTRIBUTING", "LICENSE", "ARCHITECTURE", "DESIGN", "DEPLOYMENT")
CONFIG = ("tsconfig", "eslint", "prettier", ".github/", "dependabot", "renovate", "turbo.json", "pnpm-workspace", ".nvmrc", ".node-version", "package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock", ".tool-versions")
SECURITY = ("auth", "middleware", "crypto", "secret", "token", "key", "password", "credential", "jwt", "oauth", "session", "permission", "authorization", "signing", "verify", "hash", "encrypt", "decrypt", "sign", "wallet", "did", "identity", "kyc", "trustchain", "zk")
DEPS = ("package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock", "pnpm-workspace.yaml", "pnpm-workspace.yml", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod", "go.sum")
PROSE_ONLY = (".md", ".txt", ".rst", ".adoc", "LICENSE", "CODE_OF_CONDUCT", "CONTRIBUTING", "CHANGELOG", "README", "docs/", "doc/", "website/", "site/", ".github/ISSUE_TEMPLATE", ".github/PULL_REQUEST_TEMPLATE", ".github/dependabot.yml", ".github/renovate.json")

def is_prose_only(path: str) -> bool:
    path_lower = path.lower()
    return any(path_lower.startswith(p.lower().rstrip('/')) or path_lower.endswith(p.lower()) for p in PROSE_ONLY)

def matches_any(path: str, patterns: tuple) -> bool:
    path_lower = path.lower()
    return any(
        path_lower == p.lower() or 
        path_lower.startswith(p.lower().rstrip('/') + '/') or
        path_lower.endswith(p.lower())
        for p in patterns
    )

def classify(paths: list[str]) -> dict:
    if not paths or any(p.startswith(".github/") for p in paths):
        return {k: "true" for k in [
            "node", "nextjs", "cf-workers", "mono", 
            "docs", "config", "security", "deps",
            "changed-files", "event-name"
        ]}
    
    has_node = False
    has_nextjs = False
    has_cf_workers = False
    has_mono = False
    has_docs = False
    has_config = False
    has_security = False
    has_deps = False
    
    for path in paths:
        if not path:
            continue
            
        if matches_any(path, NODE_PKG):
            has_node = True
            has_config = True
        
        if matches_any(path, NEXTJS):
            has_nextjs = True
            has_node = True
        
        if matches_any(path, CF_WORKERS):
            has_cf_workers = True
            has_node = True
        
        if matches_any(path, MONOREPO):
            has_mono = True
            has_node = True
            has_config = True
        
        if matches_any(path, DOCS):
            has_docs = True
        
        if matches_any(path, CONFIG):
            has_config = True
        
        if matches_any(path, SECURITY):
            has_security = True
        
        if matches_any(path, DEPS):
            has_deps = True
            has_config = True
    
    non_prose = [p for p in paths if not is_prose_only(p)]
    if not non_prose:
        return {
            "node": "false", "nextjs": "false", "cf-workers": "false", "mono": "false",
            "docs": "true", "config": "false", "security": "false", "deps": "false",
            "changed-files": json.dumps(paths), "event-name": os.environ.get("EVENT_NAME", "unknown")
        }
    
    return {
        "node": "true" if has_node else "false",
        "nextjs": "true" if has_nextjs else "false",
        "cf-workers": "true" if has_cf_workers else "false",
        "mono": "true" if has_mono else "false",
        "docs": "true" if has_docs else "false",
        "config": "true" if has_config else "false",
        "security": "true" if has_security else "false",
        "deps": "true" if has_deps else "false",
        "changed-files": json.dumps(paths),
        "event-name": os.environ.get("EVENT_NAME", "unknown")
    }

if __name__ == "__main__":
    paths = [line.strip() for line in sys.stdin if line.strip()]
    result = classify(paths)
    
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            for k, v in result.items():
                f.write(f"{k}={v}\n")
    
    for k, v in result.items():
        print(f"{k}={v}")