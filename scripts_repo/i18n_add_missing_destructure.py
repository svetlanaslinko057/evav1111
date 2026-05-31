#!/usr/bin/env python3
"""Add `const { tByEn } = useLang();` at the start of each component body
that uses tByEn but doesn't destructure it."""
import re
import os
import sys

ROOT = "/app/web/src"

# Find all components missing destructure
missing = []  # list of (file_path, line_no_zero_indexed)
for root, _, files in os.walk(ROOT):
    for f in files:
        if not f.endswith(".js"):
            continue
        p = os.path.join(root, f)
        text = open(p).read()
        # Match component definitions
        pat = re.compile(
            r"(?:^const\s+([A-Z]\w+)\s*=\s*(?:\(([^)]*)\)|([A-Z_]\w*))\s*=>\s*\{"
            r"|^function\s+([A-Z]\w+)\s*\(([^)]*)\)\s*\{"
            r"|^export\s+default\s+function\s+([A-Z]\w+)\s*\(([^)]*)\)\s*\{)",
            re.MULTILINE,
        )
        matches = list(pat.finditer(text))
        if not matches:
            continue
        for i, m in enumerate(matches):
            name = m.group(1) or m.group(4) or m.group(6)
            arg = m.group(2) or m.group(5) or m.group(7) or ""
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            body = text[start:end]
            uses = len(re.findall(r"\btByEn\s*\(", body))
            if uses == 0:
                continue
            has = bool(re.search(r"\{[^}]*\btByEn\b[^}]*\}\s*=\s*useLang\s*\(\s*\)", body))
            if "tByEn" in arg:
                has = True
            if not has:
                missing.append((p, start, name))

# Sort by file, then by position descending so insertions don't shift later positions
missing.sort(key=lambda x: (x[0], -x[1]))

# Apply
by_file = {}
for p, pos, name in missing:
    by_file.setdefault(p, []).append((pos, name))

fixed = 0
for p, locs in by_file.items():
    text = open(p).read()
    # Sort positions descending so insertion at later positions doesn't affect earlier
    for pos, name in locs:
        # pos is just after the `{` of the function body
        # Check if useLang is imported in file; if not, add it
        # Insert: `\n  const { tByEn } = useLang();`
        before = text[:pos]
        after = text[pos:]
        text = before + "\n  const { tByEn } = useLang();" + after
        fixed += 1
        print(f"  fixed {p} :: {name}")
    # Ensure useLang imported
    if "useLang" not in text:
        # Find an existing relative context import to mirror the path style
        ctx_match = re.search(
            r"from\s+['\"]((?:\.\./|@/)?contexts/[^'\"]+)['\"]", text
        )
        if ctx_match:
            ctx_path = ctx_match.group(1).rsplit("/", 1)[0]
            imp = f"import {{ useLang }} from '{ctx_path}/LanguageContext';\n"
        else:
            imp = "import { useLang } from '../contexts/LanguageContext';\n"
        text = re.sub(r"^(import [^\n]+\n)", r"\1" + imp, text, count=1, flags=re.MULTILINE)
    open(p, "w").write(text)

print(f"\nTotal fixed: {fixed}")
