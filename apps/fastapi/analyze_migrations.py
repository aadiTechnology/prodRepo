import os
import re

versions_dir = r"d:\Product changes\Software Secondary\prodRepo\apps\fastapi\alembic\versions"
files = [f for f in os.listdir(versions_dir) if f.endswith(".py")]

revisions = {}
all_down_revisions = set()

for f in files:
    path = os.path.join(versions_dir, f)
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
        # Handle revision: str = '...' or revision = '...'
        rev_match = re.search(r"revision(?:\s*:\s*\w+)?\s*=\s*['\"]([^'\"]+)['\"]", content)
        # Handle down_revision: ... = '...' or down_revision = '...'
        # Also handle tuples: down_revision = ('rev1', 'rev2')
        down_rev_match = re.search(r"down_revision(?:\s*:\s*[\w\[\], ]+)?\s*=\s*([^\n]+)", content)
        
        if rev_match:
            rev_id = rev_match.group(1)
            revisions[rev_id] = f
            
        if down_rev_match:
            down_val = down_rev_match.group(1).strip()
            if down_val == "None":
                continue
            # Extract IDs from strings, tuples, or lists
            ids = re.findall(r"['\"]([^'\"]+)['\"]", down_val)
            for d_id in ids:
                all_down_revisions.add(d_id)

heads = set(revisions.keys()) - all_down_revisions
print(f"Heads ({len(heads)}): {sorted(list(heads))}")
for h in sorted(list(heads)):
    print(f"  - {h} ({revisions[h]})")

missing = all_down_revisions - set(revisions.keys())
print(f"Missing Parents ({len(missing)}): {sorted(list(missing))}")

# Check for multiple roots
roots = [rev for rev, file in revisions.items() if rev not in all_down_revisions]
# Wait, roots are exactly the heads if the graph was inverted.
# Roots are revisions where down_revision is None.
real_roots = []
for f in files:
    path = os.path.join(versions_dir, f)
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
        if "down_revision" in content and "None" in content:
            # check if it's actually assigned None
            if re.search(r"down_revision(?:\s*:\s*[\w\[\], ]+)?\s*=\s*None", content):
                rev_match = re.search(r"revision(?:\s*:\s*\w+)?\s*=\s*['\"]([^'\"]+)['\"]", content)
                if rev_match:
                    real_roots.append(rev_match.group(1))

print(f"Roots (down_revision = None): {real_roots}")
