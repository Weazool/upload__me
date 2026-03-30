# upload-me

A CLI-launched, temporary file upload server. Run it, pick a folder, share the URL. The other person uploads files through a polished web interface — but nothing lands on your disk until you approve it, file by file, right in your terminal.

## Features

- **Review before upload** — You see every file (name, size, extension) before any data transfers. Accept or reject each one individually, or accept all at once.
- **Instant keypresses** — y/n/a react immediately, no Enter key needed.
- **Real-time feedback** — The uploader sees your decisions live in their browser as you review. Accepted files begin uploading automatically with progress bars.
- **Native folder picker** — On Windows, opens a folder browser dialog instead of requiring a typed path.
- **Auto-copy to clipboard** — The share URL is automatically copied to your clipboard on startup.
- **Secure by default** — 128-bit random token in the URL. No auth bypass, no directory traversal.
- **Auto-expiry** — Server shuts down after 15 minutes of inactivity. Auto-shuts down after uploads complete.
- **UPnP support** — Automatically attempts port forwarding so the URL works over the internet, not just your LAN.
- **External IP detection** — Shows your real public IP (via api.ipify.org) so you can share the link with anyone.
- **Zero config** — One command, one click. No accounts, no database, no build step.

## How It Works

```
You (terminal)                          Uploader (browser)
─────────────                           ─────────────────
$ node .
  [Folder picker opens]

  upload-me
  Local:    http://127.0.0.1:52847/u/a3f8b2c1...
  LAN:      http://192.168.1.5:52847/u/a3f8b2c1...
  External: http://88.1.2.3:52847/u/a3f8b2c1... (UPnP ✔)
  ✔ URL copied to clipboard
  Press Q or Esc to quit
  TTL: 14m 58s remaining
                                        Opens URL in browser
                                        Sees drag-and-drop upload page
                                        Selects 3 files, clicks "Submit for Review"

  3 file(s) submitted for review:
  1.  vacation-photo.jpg     (2.4 MB)
  2.  project-report.pdf     (840 KB)
  3.  raw-footage.mp4        (1.2 GB)

  ? Accept "vacation-photo.jpg"? (y/n/a) y      → Browser: Accepted ✓
  ? Accept "project-report.pdf"? (y/n/a) n      → Browser: Rejected ✗
  ? Accept "raw-footage.mp4"? (y/n/a) y         → Browser: Accepted ✓

  Review complete: 2 accepted, 1 rejected
  Waiting for upload...
                                        Accepted files upload with progress bars
                                        Each file shows: Uploading... → Done

  ✔ 2 file(s) uploaded to C:\Downloads
    • vacation-photo.jpg
    • raw-footage.mp4

  Shutting down: Upload complete
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

### Windows

Double-click `upload-me.bat` (create one with `@echo off & cd /d "%~dp0" & node . & pause`).

### Other platforms

```bash
node .
# Type the target folder path when prompted
```

## Requirements

- Node.js 18+

## How the Review Works

1. Run the app — a native folder picker opens (Windows) or you type a path
2. Server starts on a random port (50000–60000) with a unique token URL
3. The best share URL is auto-copied to your clipboard
4. Share it with whoever needs to send you files
5. They select files in their browser and click **Submit for Review**
6. You see the full file list in your terminal — name, extension, and size
7. For each file, press a single key:
   - **y** — accept (will be uploaded)
   - **n** — reject (never leaves their machine)
   - **a** — accept all remaining files
8. Only accepted files are transferred, with progress shown on both sides
9. Server shuts down automatically when done

Press **Q** or **Esc** at any time to shut down the server.

## Security

- **Token authentication** — Every URL contains a 128-bit random hex token. All endpoints require a valid token.
- **No directory traversal** — Filenames are sanitized to basenames only. Path separators and null bytes are stripped.
- **Crash-safe writes** — Files are written as `.tmp` first, then atomically renamed on completion. No partial files on disk.
- **Auto-shutdown** — 15-minute idle timeout. The server doesn't linger.
- **UPnP cleanup** — Port mappings are removed on exit, including Ctrl+C and crashes.

## Network Setup

The app shows three URLs:

| URL | Scope | Requirements |
|-----|-------|-------------|
| **Local** | Same machine | None |
| **LAN** | Same network | None |
| **External** | Anywhere on the internet | UPnP or manual port forwarding + no firewall block |

If **UPnP** shows ✔, the port is forwarded on your router automatically. If it shows ✘, you'll need to manually forward the port on your router, or the uploader must be on the same LAN.

On Windows, you may need to allow Node.js through Windows Firewall:
```powershell
# Run as admin — allows upload-me's port range
netsh advfirewall firewall add rule name="upload-me" dir=in action=allow protocol=TCP localport=50000-60000
```

## Architecture

Single Node.js process, no build step, no framework.

```
upload-me/
├── index.js          # Entry point: folder picker, lifecycle, timers
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

## Tests

```bash
npm test
```

40 tests covering token auth, file review logic, upload enforcement, duplicate filename handling, SSE events, and a full end-to-end integration test.

## License

MIT
