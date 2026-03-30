export function getUploadPageHtml({ token, expiresAt }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>upload-me</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #f0f2f5;
    color: #333;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  header {
    width: 100%;
    background: #fff;
    border-bottom: 1px solid #e1e4e8;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  header h1 { font-size: 1.25rem; font-weight: 700; color: #4a90d9; letter-spacing: -0.3px; }
  #timer {
    font-size: 0.875rem;
    font-weight: 600;
    color: #555;
    background: #f0f2f5;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid #dde1e7;
  }
  #timer.warning { color: #f39c12; border-color: #f39c12; background: #fff8ee; }
  #timer.expired { color: #e74c3c; border-color: #e74c3c; background: #fef0ee; }
  main {
    width: 100%;
    max-width: 680px;
    padding: 32px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    padding: 24px;
  }
  #drop-zone {
    border: 2px dashed #c8d0da;
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.18s, background 0.18s;
    background: #fafbfc;
  }
  #drop-zone.dragover {
    border-color: #4a90d9;
    background: #eaf3fb;
  }
  #drop-zone svg { display: block; margin: 0 auto 16px; opacity: 0.4; }
  #drop-zone p { color: #666; font-size: 0.95rem; margin-bottom: 12px; }
  #drop-zone p span { font-weight: 600; }
  #browse-btn {
    display: inline-block;
    padding: 8px 20px;
    background: #4a90d9;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  #browse-btn:hover { background: #3a7fc9; }
  #file-input { display: none; }
  #file-list { display: flex; flex-direction: column; gap: 10px; }
  .file-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e6e9ed;
  }
  .file-ext {
    min-width: 44px;
    text-align: center;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #fff;
    background: #4a90d9;
    border-radius: 6px;
    padding: 4px 6px;
    flex-shrink: 0;
  }
  .file-info { flex: 1; min-width: 0; }
  .file-name {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-size { font-size: 0.78rem; color: #888; margin-top: 2px; }
  .remove-btn {
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }
  .remove-btn:hover { color: #e74c3c; background: #fef0ee; }
  #submit-btn {
    width: 100%;
    padding: 13px;
    background: #4a90d9;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    letter-spacing: 0.01em;
  }
  #submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  #submit-btn:not(:disabled):hover { background: #3a7fc9; }
  #status-section { display: none; }
  #status-section h2, #summary-section h2 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 14px;
    color: #444;
  }
  #status-list { display: flex; flex-direction: column; gap: 10px; }
  .status-item {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #e6e9ed;
    background: #fafbfc;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .status-item .s-name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .status-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  .badge-reviewing { background: #fff3cd; color: #856404; }
  .badge-accepted  { background: #d4edda; color: #155724; }
  .badge-rejected  { background: #f8d7da; color: #721c24; }
  .badge-uploading { background: #cce5ff; color: #004085; }
  .badge-done      { background: #d4edda; color: #155724; }
  .progress-wrap {
    width: 100%;
    height: 4px;
    background: #e9ecef;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 6px;
  }
  .progress-bar {
    height: 100%;
    background: #4a90d9;
    border-radius: 2px;
    width: 0%;
    transition: width 0.2s;
  }
  #summary-section { display: none; }
  .summary-counts {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .summary-stat {
    flex: 1;
    min-width: 100px;
    padding: 16px;
    border-radius: 10px;
    text-align: center;
  }
  .summary-stat.accepted { background: #d4edda; color: #155724; }
  .summary-stat.rejected { background: #f8d7da; color: #721c24; }
  .summary-stat .stat-num { font-size: 2rem; font-weight: 800; }
  .summary-stat .stat-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  #expired-message {
    display: none;
    text-align: center;
    padding: 24px;
    color: #e74c3c;
    font-weight: 600;
    font-size: 1rem;
  }
</style>
</head>
<body>
<header>
  <h1>upload-me</h1>
  <div id="timer">--:--</div>
</header>
<main>
  <div class="card" id="drop-card">
    <div id="drop-zone">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 16 12 12 8 16"></polyline>
        <line x1="12" y1="12" x2="12" y2="21"></line>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
      </svg>
      <p><span>Drag &amp; drop files here</span> or</p>
      <button id="browse-btn" type="button">Browse files</button>
      <input id="file-input" type="file" multiple>
    </div>
    <div id="file-list" style="margin-top:0;"></div>
  </div>
  <button id="submit-btn" disabled>Submit for Review</button>
  <div id="status-section" class="card">
    <h2>Review Status</h2>
    <div id="status-list"></div>
  </div>
  <div id="summary-section" class="card">
    <h2>Upload Summary</h2>
    <div class="summary-counts">
      <div class="summary-stat accepted">
        <div class="stat-num" id="accepted-count">0</div>
        <div class="stat-label">Accepted</div>
      </div>
      <div class="summary-stat rejected">
        <div class="stat-num" id="rejected-count">0</div>
        <div class="stat-label">Rejected</div>
      </div>
    </div>
  </div>
  <div id="expired-message">Session expired. Please request a new upload link.</div>
</main>
<script>
(function() {
  'use strict';

  var TOKEN = '${token}';
  var EXPIRES_AT = ${expiresAt};

  // --- XSS protection ---
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Countdown timer ---
  var timerEl = document.getElementById('timer');
  function updateTimer() {
    var remaining = EXPIRES_AT - Date.now();
    if (remaining <= 0) {
      timerEl.textContent = 'Expired';
      timerEl.className = 'expired';
      return;
    }
    var totalSec = Math.ceil(remaining / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    timerEl.className = remaining < 120000 ? 'warning' : '';
  }
  updateTimer();
  setInterval(updateTimer, 1000);

  // --- File management ---
  var selectedFiles = [];
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var browseBtn = document.getElementById('browse-btn');
  var fileListEl = document.getElementById('file-list');
  var submitBtn = document.getElementById('submit-btn');

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function getExt(name) {
    var parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  }

  function renderFileList() {
    if (selectedFiles.length === 0) {
      fileListEl.style.marginTop = '0';
      fileListEl.innerHTML = '';
    } else {
      fileListEl.style.marginTop = '16px';
      fileListEl.innerHTML = selectedFiles.map(function(f, i) {
        return '<div class="file-item" data-idx="' + i + '">' +
          '<div class="file-ext">' + escapeHtml(getExt(f.name)) + '</div>' +
          '<div class="file-info">' +
            '<div class="file-name">' + escapeHtml(f.name) + '</div>' +
            '<div class="file-size">' + escapeHtml(formatSize(f.size)) + '</div>' +
          '</div>' +
          '<button class="remove-btn" data-idx="' + i + '" title="Remove">&times;</button>' +
        '</div>';
      }).join('');
    }
    submitBtn.disabled = selectedFiles.length === 0;
  }

  fileListEl.addEventListener('click', function(e) {
    var btn = e.target.closest('.remove-btn');
    if (btn) {
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      selectedFiles.splice(idx, 1);
      renderFileList();
    }
  });

  function addFiles(fileObjs) {
    for (var i = 0; i < fileObjs.length; i++) {
      var f = fileObjs[i];
      var duplicate = selectedFiles.some(function(sf) { return sf.name === f.name && sf.size === f.size; });
      if (!duplicate) selectedFiles.push(f);
    }
    renderFileList();
  }

  browseBtn.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  // --- Submit & SSE flow ---
  var statusSection = document.getElementById('status-section');
  var statusList = document.getElementById('status-list');
  var summarySection = document.getElementById('summary-section');
  var expiredMsg = document.getElementById('expired-message');
  var sse = null;
  var filesToUpload = [];

  submitBtn.addEventListener('click', function() {
    if (selectedFiles.length === 0) return;
    submitBtn.disabled = true;
    dropZone.style.pointerEvents = 'none';
    dropZone.style.opacity = '0.5';

    // Show status section with 'reviewing' badges
    statusSection.style.display = 'block';
    statusList.innerHTML = selectedFiles.map(function(f) {
      return '<div class="status-item" id="si-' + escapeHtml(f.name) + '">' +
        '<span class="s-name">' + escapeHtml(f.name) + '</span>' +
        '<span class="status-badge badge-reviewing">Reviewing</span>' +
      '</div>';
    }).join('');

    filesToUpload = Array.from(selectedFiles);

    // Open SSE connection
    sse = new EventSource('/u/' + TOKEN + '/events');
    sse.onmessage = handleSSE;
    sse.onerror = function() { /* reconnect handled by browser */ };

    // Send file metadata
    var metadata = filesToUpload.map(function(f) {
      return { name: f.name, size: f.size, type: f.type };
    });

    fetch('/u/' + TOKEN + '/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    }).catch(function(err) {
      console.error('Review request failed', err);
    });
  });

  function handleSSE(event) {
    var data;
    try { data = JSON.parse(event.data); } catch(e) { return; }

    if (data.type === 'file-status') {
      updateFileStatus(data.name, data.status);
    } else if (data.type === 'review-complete') {
      uploadAccepted(data.accepted || []);
    } else if (data.type === 'upload-progress') {
      updateProgress(data.filename, data.percent);
    } else if (data.type === 'upload-complete') {
      showSummary(data.files || []);
      if (sse) { sse.close(); sse = null; }
    } else if (data.type === 'session-expired') {
      showExpired();
      if (sse) { sse.close(); sse = null; }
    }
  }

  function updateFileStatus(name, status) {
    var item = document.getElementById('si-' + name);
    if (!item) return;
    var badge = item.querySelector('.status-badge');
    if (!badge) return;
    badge.className = 'status-badge';
    if (status === 'accepted') {
      badge.classList.add('badge-accepted');
      badge.textContent = 'Accepted';
      if (!item.querySelector('.progress-wrap')) {
        var pw = document.createElement('div');
        pw.className = 'progress-wrap';
        pw.innerHTML = '<div class="progress-bar" id="pb-' + escapeHtml(name) + '"></div>';
        item.appendChild(pw);
      }
    } else if (status === 'rejected') {
      badge.classList.add('badge-rejected');
      badge.textContent = 'Rejected';
    } else if (status === 'uploading') {
      badge.classList.add('badge-uploading');
      badge.textContent = 'Uploading...';
    } else if (status === 'done') {
      badge.classList.add('badge-done');
      badge.textContent = 'Done';
    } else {
      badge.classList.add('badge-reviewing');
      badge.textContent = 'Reviewing';
    }
  }

  function uploadAccepted(acceptedList) {
    var acceptedNames = acceptedList.map(function(a) { return a.name || a; });
    var files = filesToUpload.filter(function(f) { return acceptedNames.indexOf(f.name) !== -1; });

    if (files.length === 0) {
      showSummary([]);
      return;
    }

    // Update badges to "Uploading"
    files.forEach(function(f) { updateFileStatus(f.name, 'uploading'); });

    var formData = new FormData();
    files.forEach(function(f) { formData.append('files', f, f.name); });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/u/' + TOKEN + '/upload');

    xhr.upload.onprogress = function(e) {
      if (!e.lengthComputable) return;
      var pct = Math.round((e.loaded / e.total) * 100);
      files.forEach(function(f) { updateProgress(f.name, pct); });
    };

    xhr.onload = function() {
      files.forEach(function(f) { updateFileStatus(f.name, 'done'); });
      try {
        var body = JSON.parse(xhr.responseText);
        showSummary(body.files || []);
      } catch(e) {
        showSummary(files.map(function(f) { return { name: f.name, status: 'uploaded' }; }));
      }
      if (sse) { sse.close(); sse = null; }
    };

    xhr.onerror = function() {
      console.error('Upload XHR failed');
    };

    xhr.send(formData);
  }

  function updateProgress(filename, percent) {
    var bar = document.getElementById('pb-' + filename);
    if (bar) bar.style.width = percent + '%';
  }

  function showSummary(files) {
    var accepted = files.filter(function(f) { return f.status === 'uploaded'; }).length;
    var rejected = files.filter(function(f) { return f.status === 'rejected'; }).length;
    document.getElementById('accepted-count').textContent = accepted;
    document.getElementById('rejected-count').textContent = rejected;
    summarySection.style.display = 'block';
    summarySection.scrollIntoView({ behavior: 'smooth' });
  }

  function showExpired() {
    expiredMsg.style.display = 'block';
    if (sse) { sse.close(); sse = null; }
  }

})();
</script>
</body>
</html>`;
}
