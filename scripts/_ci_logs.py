import urllib.request, json

# Get CI logs for the failed type-check step
runs_url = 'https://api.github.com/repos/pai-list/AxiomID/actions/runs/29892717458/jobs'
r = urllib.request.urlopen(runs_url, timeout=10)
jobs = json.loads(r.read())
print(json.dumps(jobs, indent=2)[:3000])
