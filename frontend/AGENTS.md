<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Troubleshooting

### Routes returning 404 (stale Turbopack cache)
If a page file exists but returns 404, the `.next` Turbopack cache is likely stale/corrupted. Run:
```
npm run clean
```
Then restart the dev server. This deletes the `.next` folder and forces a clean rebuild.

### "Another next dev server is already running"

**Root cause:** A previous `next dev` process was left running (another terminal, crashed VS Code/Cursor terminal, or assistant action). Next.js detects this by checking whether a node process from this project directory is already running `next dev`.

**To resolve:**
```powershell
# Option A (recommended): Use the cleanup script
npm run cleanup:dev

# Option B: Kill manually using the PID from the error
taskkill /F /PID <PID_FROM_ERROR>
```

**What the cleanup script does:**
1. Scans all `node.exe` processes on the system
2. Verifies the command line contains this project directory AND `next dev`
3. This avoids depending on lock file internals or Next.js binary paths
4. Also reads `.next/dev/lock` as a hint but doesn't rely on it
5. Asks for confirmation before terminating (use `-- -Force` to skip prompts)

**To prevent in the future:**
- Use a single terminal for `npm run dev` and close it with Ctrl+C before starting another
- If using VS Code/Cursor integrated terminal, close the terminal tab when done
- If the error appears, run `npm run cleanup:dev` first
