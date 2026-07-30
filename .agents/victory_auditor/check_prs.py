import subprocess
import json

prs = [58, 59, 64, 65, 66, 67]
repo = "Moeabdelaziz007/AxiomID"

print(f"Checking reviews for PRs in {repo}...")
for pr in prs:
    try:
        # Run gh api to get reviews for the PR
        cmd = ["gh", "api", f"repos/{repo}/pulls/{pr}/reviews"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        reviews = json.loads(result.stdout)
        
        print(f"\n--- PR {pr} ---")
        if not reviews:
            print("No reviews found.")
            continue
            
        # We want to find reviews submitted by the team
        for review in reviews:
            user = review.get("user", {}).get("login")
            state = review.get("state")
            body = review.get("body", "")
            submitted_at = review.get("submitted_at")
            
            # Print basic details
            print(f"Review by: {user} | State: {state} | Submitted: {submitted_at}")
            first_line = body.split("\n")[0] if body else "(Empty body)"
            print(f"Body preview: {first_line}")
            
    except subprocess.CalledProcessError as e:
        print(f"Error checking PR {pr}: {e.stderr.strip()}")
    except Exception as e:
        print(f"Exception checking PR {pr}: {str(e)}")
