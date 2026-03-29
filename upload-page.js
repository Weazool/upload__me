export function getUploadPageHtml({ token, expiresAt }) {
  return `<!DOCTYPE html>
<html><head><title>upload-me</title></head>
<body><h1>Upload Page</h1><p>Token: ${token}</p></body></html>`;
}
