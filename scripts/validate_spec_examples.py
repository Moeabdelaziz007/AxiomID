#!/usr/bin/env python3
"""
OpenIdentity Specification Examples Validator
Validates YAML frontmatter examples in docs/openidentity against openidentity.schema.json.
"""

import json
import re
import yaml
import jsonschema

SCHEMA_PATH = "docs/openidentity/openidentity.schema.json"

def load_schema():
    with open(SCHEMA_PATH, "r") as f:
        return json.load(f)

def extract_yaml_blocks(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    # 1. Match ```markdown or ```yaml code blocks
    raw_blocks = re.findall(r"```(?:markdown|yaml|json)?\s*\n(.*?)```", content, re.DOTALL)
    valid_data = []
    
    for b in raw_blocks:
        # Check if block contains YAML frontmatter fenced by ---
        fm_match = re.search(r"---\s*\n(.*?)\n---", b, re.DOTALL)
        yaml_text = fm_match.group(1) if fm_match else b
        
        try:
            parsed = yaml.safe_load(yaml_text)
            if isinstance(parsed, dict) and ("version" in parsed and "did" in parsed):
                valid_data.append((filepath, parsed))
        except Exception:
            pass
            
    return valid_data

def validate_all():
    schema = load_schema()
    validator = jsonschema.Draft202012Validator(schema)

    files = [
        "docs/openidentity/OpenIdentity.md",
        "docs/openidentity/AgentPassport.md",
        "docs/openidentity/KYA.md",
    ]

    all_valid = True
    total_validated = 0
    for f in files:
        blocks = extract_yaml_blocks(f)
        print(f"\n📄 Validating examples in '{f}' ({len(blocks)} candidate blocks found)...")
        for idx, (path, data) in enumerate(blocks, 1):
            errors = list(validator.iter_errors(data))
            total_validated += 1
            if not errors:
                print(f"  ✅ Example #{idx} ({data.get('name', 'unnamed')}): PASS")
            else:
                all_valid = False
                print(f"  ❌ Example #{idx} ({data.get('name', 'unnamed')}): FAIL ({len(errors)} schema errors)")
                for err in errors:
                    print(f"     • Path: {'/'.join(str(p) for p in err.path)} -> {err.message}")

    print(f"\nTotal spec examples validated: {total_validated}")
    return all_valid

if __name__ == "__main__":
    success = validate_all()
    if not success:
        print("\n❌ Schema validation failed for one or more spec examples.")
        exit(1)
    else:
        print("\n🎉 ALL spec examples successfully validated against openidentity.schema.json!")
