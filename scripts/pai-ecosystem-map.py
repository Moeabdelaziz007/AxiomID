#!/usr/bin/env python3
"""
PAI Ecosystem Map — Auto-indexer
Scrapes GitHub + local repos → JSON dataset → table UI
Similar to aeoess/agent-ecosystem-map but automated for PAI Universe
"""

import json, os, subprocess, sys, time
from datetime import datetime, timezone

ECOSYSTEM_FILE = os.path.expanduser("~/Desktop/AxiomID/pai/docs/pai-ecosystem.json")

PROJECTS = [
    # name, repo_url, maturity, license, tags
    ("PAI Passport",            "https://github.com/your-org/pai-passport",            "beta",      "Apache-2.0", ["identity","auth","passport"]),
    ("0Cost Agentic Framework", "https://github.com/your-org/0CostAgenticFrameWork",   "alpha",     "Apache-2.0", ["framework","agents","cloudflare"]),
    ("PAI MCP Gateway",         "https://github.com/your-org/pai-mcp-gateway",         "beta",      "Apache-2.0", ["mcp","gateway","cloudflare"]),
    ("Ghost.Build",             "https://github.com/timescale/ghost",                  "production","Timescale",  ["database","postgres","agents"]),
    ("Kernel.sh",               "https://github.com/trycua/cua",                       "production","Apache-2.0", ["browser","qa","testing"]),
    ("Agent Passport System",   "https://github.com/aeoess/agent-passport-system",     "beta",      "Apache-2.0", ["identity","governance","receipts"]),
    ("MCP SDK",                 "https://github.com/modelcontextprotocol/specification","production","MIT",        ["protocol","mcp","tools"]),
    ("A2A Protocol",            "https://github.com/google/A2A",                       "beta",      "Apache-2.0", ["protocol","agent-to-agent"]),
    ("Workers AI",              "https://github.com/cloudflare/workers-ai",            "production","MIT",        ["ai","inference","cloudflare"]),
    ("Durable Objects",         "https://github.com/cloudflare/do",                    "production","MIT",        ["durable","state","cloudflare"]),
    ("Pi Network SDK",          "https://github.com/pi-network/pi-sdk",                "production","PiOS",       ["pi","blockchain","wallet"]),
    ("Vercel AI SDK",           "https://github.com/vercel/ai",                        "production","Apache-2.0", ["ai","sdk","streaming"]),
    ("OpenClaw Skills",         "https://github.com/VoltAgent/awesome-openclaw-skills","production","MIT",        ["skills","agents","marketplace"]),
    ("clawskills.sh",           "https://clawskills.sh",                               "production","—",          ["discovery","skills","catalog"]),
    ("agency-agents",           "https://github.com/msitarzewski/agency-agents",       "production","MIT",        ["personas","agents","library"]),
    ("Cloudflare Agents SDK",   "https://github.com/cloudflare/agents",                "beta",      "MIT",        ["sdk","agents","durable"]),
    ("Vercel Passport",         "https://github.com/remiconnesson/vercel-passport-skill","beta",     "Apache-2.0", ["auth","passport","vercel"]),
    ("TigerData",               "https://www.tigerdata.com",                           "production","—",          ["timeseries","database","analytics"]),
]

def fetch_github_stats(repo_url):
    """Fetch GitHub stats via API"""
    if "github.com" not in repo_url:
        return {"stars": "—", "last_push": "—", "created": "—", "contributors": "—"}
    
    api_url = repo_url.replace("https://github.com/", "https://api.github.com/repos/")
    api_url = api_url.rstrip("/")
    
    try:
        resp = subprocess.run(
            ["curl", "-sL", api_url],
            capture_output=True, text=True, timeout=10
        )
        data = json.loads(resp.stdout)
        if "message" in data and data["message"] == "Not Found":
            return {"stars": "N/A", "last_push": "?", "created": "?", "contributors": "?"}
        
        return {
            "stars": data.get("stargazers_count", "?"),
            "last_push": data.get("pushed_at", "?")[:10] if data.get("pushed_at") else "?",
            "created": data.get("created_at", "?")[:10] if data.get("created_at") else "?",
            "contributors": data.get("forks_count", "?"),
        }
    except Exception as e:
        return {"stars": "error", "last_push": str(e)[:20], "created": "?", "contributors": "?"}

def build_ecosystem():
    """Build the full ecosystem dataset"""
    projects = []
    
    for name, repo_url, maturity, license_type, tags in PROJECTS:
        print(f"  Fetching: {name}...", end=" ")
        stats = fetch_github_stats(repo_url)
        print(f"★{stats['stars']}")
        
        projects.append({
            "name": name,
            "url": repo_url,
            "maturity": maturity,
            "license": license_type,
            "tags": tags,
            "stars": stats["stars"],
            "last_push": stats["last_push"],
            "created": stats["created"],
            "contributors": stats["contributors"],
        })
        time.sleep(0.5)  # Rate limit
    
    ecosystem = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_projects": len(projects),
        "projects": projects,
    }
    
    with open(ECOSYSTEM_FILE, "w") as f:
        json.dump(ecosystem, f, indent=2)
    
    print(f"\n✅ Ecosystem map saved: {ECOSYSTEM_FILE}")
    print(f"   {len(projects)} projects indexed")
    return ecosystem

def generate_table(data):
    """Generate markdown table from ecosystem data"""
    lines = [
        "| Project | Maturity | Stars | License | Last Push |",
        "|---------|----------|-------|---------|-----------|",
    ]
    for p in sorted(data["projects"], key=lambda x: str(x["stars"]), reverse=True):
        stars = f"★{p['stars']}" if p['stars'] not in ("—", "N/A", "error") else p['stars']
        lines.append(f"| [{p['name']}]({p['url']}) | {p['maturity']} | {stars} | {p['license']} | {p['last_push']} |")
    
    return "\n".join(lines)

if __name__ == "__main__":
    print("🌐 PAI Ecosystem Map Builder\n")
    data = build_ecosystem()
    print("\n" + "=" * 60)
    print("MARKDOWN TABLE")
    print("=" * 60)
    print(generate_table(data))
