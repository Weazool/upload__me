# upload-me

A CLI-launched, temporary file upload server. Run it, pick a folder, share the URL. The other person uploads files through a polished web interface — but nothing lands on your disk until you approve it, file by file, right in your terminal.

## Features

- **Review before upload** — You see every file (name, size, extension) before any data transfers. Accept or reject each one individually, or accept all at once.
- **Real-time feedback** — The uploader sees your decisions live in their browser as you review. Accepted files begin uploading automatically with progress bars.
- **Secure by default** — 128-bit random token in the URL. No auth bypass, no directory traversal.
- **Auto-expiry** — Server shuts down after 15 minutes of inactivity. Once uploads finish, it shuts down automatically.
- **UPnP support** — Automatically attempts port forwarding so the URL works over the internet, not just your LAN.
- **External IP detection** — Shows your real public IP (via api.ipify.org) so you can share the link with anyone.
- **Zero config** — One command, one prompt. No accounts, no database, no build step.

## How It Works

```
You (terminal)                          Uploader (browser)
─────────────                           ─────────────────
$ node .
? Target folder: ./downloads
                                        Opens URL in browser
  upload-me                             Sees drag-and-drop upload page
  Local:    http://127.0.0.1:52847/u/a3f8b2c1...
  LAN:      http://192.168.1.5:52847/u/a3f8b2c1...
  External: http://88.1.2.3:52847/u/a3f8b2c1... (UPnP ✔)
  TTL: 14m 58s remaining
                                        Selects 3 files, clicks "Submit for Review"

  3 file(s) submitted for review:
  1.  vacation-photo.jpg     (2.4 MB)
  2.  project-report.pdf     (840 KB)
  3.  raw-footage.mp4        (1.2 GB)

  ? Accept "vacation-photo.jpg"? (y/n/a) y      → Browser shows: Accepted ✓
  ? Accept "project-report.pdf"? (y/n/a) n      → Browser shows: Rejected ✗
  ? Accept "raw-footage.mp4"? (y/n/a) y         → Browser shows: Accepted ✓

                                        Accepted files upload with progress bars
  vacation-photo.jpg  █████████████████████████ 100%
  raw-footage.mp4     ████████████░░░░░░░░░░░░░  48%

  ✓ All uploads complete.
  Shutting down.
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/Weazool/upload__me.git
cd upload__me
npm install

# Run
node .
```

Or with npx (after publishing):

```bash
npx upload-me
```

### Windows

Double-click `upload-me.bat` (create one with `@echo off & cd /d "%~dp0" & node . & pause`).

## Requirements

- Node.js 18+

## How the Review Works

1. You run the app and enter a target folder
2. Server starts on a random port (50000–60000) with a unique token URL
3. Share the URL with whoever needs to send you files
4. They select files in their browser and click **Submit for Review**
5. You see the full file list in your terminal — name, extension, and size
6. For each file, you choose:
   - **y** — accept (will be uploaded)
   - **n** — reject (never leaves their machine)
   - **a** — accept all remaining files
7. Only accepted files are transferred
8. Server shuts down when done

## Security

- **Token authentication** — Every URL contains a 128-bit random hex token. All endpoints require a valid token.
- **No directory traversal** — Filenames are sanitized to basenames only. Path separators and null bytes are stripped.
- **Crash-safe writes** — Files are written as `.tmp` first, then atomically renamed on completion. No partial files on disk.
- **Auto-shutdown** — 15-minute idle timeout. The server doesn't linger.
- **UPnP cleanup** — Port mappings are removed on exit, including Ctrl+C and crashes.

## Architecture

Single Node.js process, no build step, no framework.

```
upload-me/
├── index.js          # Entry point: folder prompt, lifecycle, timers
├── server.js         # Express: routes, token auth, SSE, file upload
├── console-ui.js     # Terminal: review prompts, progress bars, banner
├── upload-page.js    # Browser: self-contained HTML/CSS/JS upload page
├── upnp.js           # UPnP port mapping with auto-cleanup
└── package.json
```

| Dependency | Purpose |
|------------|---------|
| express | HTTP server |
| multer | Multipart upload parsing |
| @runonflux/nat-upnp | UPnP port forwarding |
| chalk | Colored terminal output |

## Configuration

There's nothing to configure. The app picks a random port, generates a random token, and auto-detects your network setup. If you need to change the timeout or port range, edit the constants in `index.js`.

## Tests

```bash
npm test
```

40 tests covering token auth, file review logic, upload enforcement, duplicate filename handling, SSE events, and a full end-to-end integration test.

## License

MIT
