const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.vtt': 'text/vtt',
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Strip query parameters from URL
  const urlWithoutQuery = req.url.split('?')[0];
  
  let filePath = '.' + urlWithoutQuery;
  if (filePath === './') {
    filePath = './demo/demo.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      const cacheHeaders = contentType === 'text/html'
        ? { 'Cache-Control': 'no-cache' }
        : { 'Cache-Control': 'public, max-age=31536000, immutable' };

      res.writeHead(200, { 'Content-Type': contentType, ...cacheHeaders });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Opening demo.html at http://localhost:${PORT}/demo/demo.html`);
});

