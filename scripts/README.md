# Data Extraction Scripts

Scripts to extract map data from Serebii while maintaining correct coordinate/ID alignment.

## Quick Start

1. **Extract coordinates from Serebii map:**
   ```bash
   # 1. Open https://www.serebii.net/pokearth/lumiosecity/
   # 2. Open browser console (F12)
   # 3. Paste contents of extract-all-serebii-data.js
   # 4. Downloads serebii-lumiose-complete.json
   ```

2. **Fetch Pokemon spawn tables:**
   ```bash
   bun run scripts/fetch-spawn-tables.ts serebii-lumiose-complete.json
   ```

3. **Parse spawn table HTML:**
   ```bash
   bun run scripts/parse-spawn-tables.ts data/spawn-tables-raw.json data/parsed-pokemon.json
   ```

4. **Merge into final dataset:**
   ```bash
   bun run scripts/merge-complete-data.ts
   ```

## Scripts Overview

See `docs/data-extraction-guide.md` for detailed documentation.
