#!/usr/bin/env python3
"""
Documentation Link Checker
Audits all markdown links in docs/ for dead local links or broken section anchors.
"""

import os
import re
import glob

DOCS_DIR = "docs/openidentity"

def get_markdown_files():
    return glob.glob(f"{DOCS_DIR}/*.md") + ["README.md"]

def extract_anchors(filepath):
    anchors = set()
    with open(filepath, "r") as f:
        for line in f:
            header_match = re.match(r"^#{1,6}\s+(.*)", line)
            if header_match:
                title = header_match.group(1).strip()
                # GitHub markdown anchor transformation
                anchor = title.lower()
                anchor = re.sub(r"[^\w\s-]", "", anchor)
                anchor = re.sub(r"\s+", "-", anchor)
                anchors.add(anchor)
    return anchors

def check_links():
    md_files = get_markdown_files()
    broken_count = 0

    print("🔍 Auditing Documentation Links...")
    for src_file in md_files:
        if not os.path.exists(src_file):
            continue
        with open(src_file, "r") as f:
            content = f.read()

        # Match markdown links: [text](path_or_url)
        links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", content)
        for text, link in links:
            if link.startswith("http://") or link.startswith("https://"):
                continue  # Skip external HTTP check for speed
            
            # Handle local file & anchor links
            parts = link.split("#")
            target_path = parts[0]
            target_anchor = parts[1] if len(parts) > 1 else None

            # Resolve relative file path
            if target_path == "":
                resolved_file = src_file
            else:
                base_dir = os.path.dirname(src_file)
                resolved_file = os.path.normpath(os.path.join(base_dir, target_path))

            if not os.path.exists(resolved_file):
                print(f"❌ DEAD FILE LINK in '{src_file}': [{text}]({link}) -> File missing: {resolved_file}")
                broken_count += 1
            elif target_anchor:
                anchors = extract_anchors(resolved_file)
                if target_anchor not in anchors:
                    print(f"⚠️  MISSING ANCHOR in '{src_file}': [{text}]({link}) -> Anchor '#{target_anchor}' not found in {resolved_file}")
                    broken_count += 1

    if broken_count == 0:
        print("🎉 ALL internal links and anchors are 100% VALID!")
        return True
    else:
        print(f"\n❌ Found {broken_count} broken/dead links.")
        return False

if __name__ == "__main__":
    success = check_links()
    if not success:
        exit(1)
