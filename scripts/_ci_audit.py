import urllib.request, json

runs_url = 'https://api.github.com/repos/pai-list/AxiomID/actions/runs?per_page=5&status=failure&branch=main'
r = urllib.request.urlopen(runs_url, timeout=10)
runs = json.loads(r.read())
print('Total failed runs:', runs.get('total_count', 0))
for run in runs.get('workflow_runs', []):
    created = run['created_at'][:16]
    print(f'\nWorkflow: {run["name"]} #{run["run_number"]}')
    print(f'  Branch: {run["head_branch"]}')
    print(f'  Created: {created}')
    print(f'  URL: {run["html_url"]}')
    jobs_r = urllib.request.urlopen(run['jobs_url'], timeout=10)
    jobs = json.loads(jobs_r.read())
    for job in jobs.get('jobs', []):
        for step in job.get('steps', []):
            if step.get('conclusion') == 'failure':
                print(f'  ❌ {job["name"]} > {step["name"]}')
