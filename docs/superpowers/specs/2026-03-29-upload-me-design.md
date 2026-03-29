# upload-me — Design Spec

## Overview

A CLI-launched, temporary file upload server. Run it, pick a target folder, and get a shareable URL. Someone opens the URL in their browser, selects files, and you review the list in your console before any upload begins. Only accepted files are transferred and saved.

## User Flow

### Server operator (you)

1. Run `node .` (or `npx upload-me`)
2. Prompted for a target folder path (validated to exist)
3. Server starts on a random port (50000–60000) with a crypto-random token in the URL
4. UPnP port mapping is automatically attempted; external URL shown if successful
5. Console displays local + network URLs and a 15-minute countdown
6. When the uploader submits their file list:
   - Console shows all files with name, extension, and size
   - Interactive prompt per file: `y` (accept), `n` (reject), `a` (accept all remaining)
7. Only accepted files are uploaded; progress bars shown in console
8. After all uploads complete, server shuts down and UPnP mapping is removed

### Uploader (browser user)

1. Opens the shared URL in a browser
2. Sees a clean, modern upload page with:
   - Session TTL countdown timer
   - Drag-and-drop zone + file browse button
3. Selects files — sees a list with names, sizes, extensions
4. Clicks "Submit for Review"
5. Sees per-file real-time status via SSE:
   - "Waiting for review..." → "Accepted" / "Rejected" per file
6. Accepted files begin uploading automatically with per-file progress bars
7. Final summary: "X files uploaded, Y rejected. Done."

## Architecture

Single Node.js process, no build step.

```
upload-me/
├── index.js          # Entry point: folder prompt, server lifecycle, timers
├── server.js         # Express app: routes, middleware, token auth, SSE
├── upnp.js           # UPnP port mapping (auto-attempt + cleanup on exit)
├── console-ui.js     # Interactive file review prompts + progress display
├── upload-page.js    # Exports the HTML/CSS/JS string for the browser UI
├── package.json
└── .gitignore
```

## Components

### 1. Entry Point (`index.js`)

- Prompts for target folder using readline (validates path exists and is a directory)
- Generates random port: `Math.floor(Math.random() * 10001) + 50000`
- Generates token: `crypto.randomBytes(16).toString('hex')`
- Starts Express server
- Calls UPnP module to attempt port mapping
- Prints startup banner with local/network URLs and countdown
- Manages 15-minute idle timeout:
  - Timer starts when server is ready
  - Cancelled when uploader submits file list for review
  - If timer expires: prints message, cleans up, exits

### 2. Express Server (`server.js`)

**Routes:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/u/:token` | Token in URL | Serve upload page HTML |
| POST | `/u/:token/review` | Token in URL | Receive file metadata (names, sizes) for review |
| GET | `/u/:token/events` | Token in URL | SSE stream for real-time status updates |
| POST | `/u/:token/upload` | Token in URL | Receive accepted files (multipart) |

**Middleware:**
- Token validation: compare `:token` param against generated token, 403 on mismatch
- Request size: no hard limit enforced by the app (unlimited uploads as requested)
- CORS: not needed (same-origin, served from same Express instance)

**SSE events sent to browser:**
- `review-start` — review has begun
- `file-status` — `{ filename, status: "accepted"|"rejected" }`
- `review-complete` — `{ accepted: [...], rejected: [...] }`
- `upload-progress` — `{ filename, percent }`
- `upload-complete` — all done, show summary
- `session-expired` — timeout reached, close page

### 3. Upload Page (`upload-page.js`)

Returns a self-contained HTML string (no external dependencies). Embedded CSS + JS.

**UI elements:**
- Header with app name and TTL countdown (server embeds expiry timestamp in the HTML)
- Drag-and-drop zone with visual feedback (hover state)
- "Browse files" button
- File list table: name, extension, size (human-readable), status icon
- "Submit for Review" button (disabled until files selected)
- Real-time status section (appears after submit):
  - Per-file review status with spinner/checkmark/cross
  - Per-file upload progress bars (only for accepted files)
  - Final summary message

**Upload mechanism:**
- File metadata sent via `fetch` POST (JSON: `[{ name, size, type }]`)
- After review, accepted files uploaded via `XMLHttpRequest` (for progress events) as `multipart/form-data`
- SSE via `EventSource` for receiving status updates

**Styling:** Modern, minimal — white background, rounded cards, system font stack, subtle shadows, responsive for mobile.

### 4. Console UI (`console-ui.js`)

**File review prompt:**
```
─────────────────────────────────
  3 files submitted for review:
─────────────────────────────────
  1. vacation-photo.jpg    (2.4 MB)
  2. project-report.pdf    (840 KB)
  3. raw-footage.mp4       (1.2 GB)

? Accept "vacation-photo.jpg" (2.4 MB)? (y/n/a) _
```

- `y` = accept this file
- `n` = reject this file
- `a` = accept all remaining files
- Uses Node.js `readline` for interactive input
- Each decision is streamed to the browser via SSE in real-time

**Upload progress:**
- Shows per-file progress bars using terminal escape codes
- Updates in-place (overwrites lines)

**Startup banner:**
- Local URL, network URL (if UPnP succeeded), countdown timer
- Timer updates every second in-place

### 5. UPnP Module (`upnp.js`)

- Uses `nat-upnp` (or `@runonflux/nat-upnp`) to create a port mapping
- Maps `external:randomPort → internal:randomPort` (TCP)
- On success: resolves external IP, returns external URL
- On failure: logs warning, continues with local-only URL
- Cleanup function: removes port mapping on exit (called on SIGINT, SIGTERM, and normal exit)
- Mapping description: `"upload-me-temp"` for easy identification

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and routing |
| `multer` | Multipart file upload parsing |
| `nat-upnp` or `@runonflux/nat-upnp` | UPnP port forwarding |
| `chalk` | Colored console output |

No build tools. No frontend framework. No database.

## Security

- **Token in URL:** 32-character hex token (128 bits of entropy). All routes require valid token.
- **No directory traversal:** Uploaded filenames are sanitized (stripped of path separators, null bytes). Files are saved with their original name but only the basename.
- **Crash-safe writes:** Files are written to a temp file in the target folder first, then renamed on completion. This prevents partial files from appearing if the upload is interrupted.
- **Auto-shutdown:** 15-minute idle timeout prevents forgotten open servers.
- **UPnP cleanup:** Port mapping is always removed on exit (including crash handlers).

## Edge Cases

- **Duplicate filenames:** If a file with the same name exists in the target folder, append a numeric suffix (e.g., `photo (1).jpg`).
- **Uploader disconnects mid-review:** No files have been transferred yet (review is metadata-only). Server returns to waiting state and restarts the 15-minute idle timer.
- **Uploader disconnects mid-upload:** Incomplete files are cleaned up. Console shows error. Server shuts down.
- **No UPnP gateway found:** Server works on LAN only. Console shows local URL with a note that UPnP failed.
- **Target folder becomes unavailable:** Check write permissions on startup. If write fails during upload, show error and abort.
- **Ctrl+C:** Graceful shutdown — clean up temp files, remove UPnP mapping, exit.

## Verification

1. Run `node .`, enter a valid folder path → server starts, URLs printed
2. Open the URL in a browser → upload page loads with countdown
3. Select multiple files, click "Submit for Review" → console shows file list
4. Accept some, reject some → browser shows real-time accept/reject status
5. Accepted files upload with progress bars in both browser and console
6. Files appear in the target folder; rejected files do not
7. Server shuts down automatically after completion
8. Wait 15 minutes without action → server auto-shuts down
9. Test with invalid token → 403 response
10. Test UPnP by checking external URL accessibility (network-dependent)
