#!/usr/bin/env python3
"""Put a jobs JSON file into index.html so the page works as one file (phone, artifact, GitHub preview).

Usage: python3 inline_data.py <jobs.json> <index.html> <out.html>
"""
import sys
import pathlib

jobs, page, out = (pathlib.Path(a) for a in sys.argv[1:4])
data = jobs.read_text(encoding="utf-8").replace("</", "<\\/")
html = page.read_text(encoding="utf-8")
assert "__JOBS_DATA__" in html, "placeholder missing from index.html"
out.write_text(html.replace("__JOBS_DATA__", data), encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
