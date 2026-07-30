import subprocess
import json
import os

prs = [58, 59, 64, 65, 66, 67]
repo = "Moeabdelaziz007/AxiomID"
output_path = "/Users/cryptojoker710/Desktop/AxiomID/.agents/victory_auditor/reviews_verification.md"

results = []

print(f"Checking reviews for PRs 58, 59, 64, 65, 66, 67 in {repo}...")

for pr in prs:
    try:
        cmd = ["gh", "api", f"repos/{repo}/pulls/{pr}/reviews"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        reviews = json.loads(result.stdout)
        
        found = False
        for review in reviews:
            user = review.get("user", {}).get("login")
            # We look for reviews from Moeabdelaziz007 (since the gh CLI is authenticated as Moeabdelaziz007)
            if user == "Moeabdelaziz007":
                body = review.get("body", "")
                submitted_at = review.get("submitted_at")
                state = review.get("state")
                
                # Check recommendation and score in the body
                rec = "UNKNOWN"
                score = "UNKNOWN"
                if "GOOD FOR MERGE" in body:
                    rec = "GOOD FOR MERGE"
                elif "BAD FOR MERGE" in body:
                    rec = "BAD FOR MERGE"
                
                # Try to extract score
                for line in body.split("\n"):
                    if "Score" in line or "score" in line:
                        score = line.strip()
                        break
                
                results.append({
                    "pr": pr,
                    "found": True,
                    "user": user,
                    "state": state,
                    "submitted_at": submitted_at,
                    "recommendation": rec,
                    "score": score,
                    "body_preview": body[:200].replace("\n", " ") + "..."
                })
                found = True
                break
                
        if not found:
            results.append({
                "pr": pr,
                "found": False,
                "error": "No review found from Moeabdelaziz007"
            })
            
    except Exception as e:
        results.append({
            "pr": pr,
            "found": False,
            "error": str(e)
        })

# Write findings to markdown
with open(output_path, "w") as f:
    f.write("# GitHub Reviews Verification Log\n\n")
    f.write("| PR | Status | Recommendation | Score | Submitted At | Preview |\n")
    f.write("|---|---|---|---|---|---|\n")
    for r in results:
        if r["found"]:
            f.write(f"| {r['pr']} | FOUND | {r['recommendation']} | {r['score']} | {r['submitted_at']} | {r['body_preview']} |\n")
        else:
            f.write(f"| {r['pr']} | NOT FOUND | - | - | - | Error: {r.get('error')} |\n")

print(f"Results written to {output_path}")
