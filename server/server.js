// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Directory containing editable files (folder named 'files' inside the server dir)
const baseDir = path.resolve(__dirname, 'files');

// Example document path inside the files directory
const FILE_PATH = path.join(baseDir, 'example.md');

// Load document from disk if it exists
let documentText = "";
if (fs.existsSync(FILE_PATH)) {
  documentText = fs.readFileSync(FILE_PATH, "utf8");
}

// Save to disk helper
function saveDocument(text) {
  fs.writeFileSync(FILE_PATH, text, "utf8");
}

io.on("connection", (socket) => {
  console.log("a user connected");

  // Send doc immediately to new client
  socket.emit("load-document", documentText);

  // Let clients re-request doc if they reconnect
  socket.on("request-document", () => {
    socket.emit("load-document", documentText);
  });

  socket.on("send-changes", (delta, callback) => {
    documentText = delta;

    // Broadcast changes to others
    socket.broadcast.emit("receive-changes", delta);

    // Try to save document
    try {
      saveDocument(documentText);
      callback({ success: true });
    } catch (err) {
      callback({ success: false, message: "Failed to save document" });
    }
  });
});

server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);

// --- Simple REST API for file explorer ---
// Enable JSON body parsing and CORS for simple client access
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Helper: list directory contents (non-recursive)
app.get('/api/files', (req, res) => {
  const rel = req.query.path ? String(req.query.path) : '.';
  const target = path.resolve(baseDir, rel);

  // Prevent escaping the server directory (use path.relative for robust check)
  const relToBase = path.relative(baseDir, target);
  if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) return res.status(400).json({ error: 'Invalid path' });

  try {
    const entries = fs.readdirSync(target, { withFileTypes: true }).map(dirent => ({
      name: dirent.name,
      path: path.relative(baseDir, path.join(target, dirent.name)),
      isDirectory: dirent.isDirectory(),
    }));
    res.json({ path: path.relative(baseDir, target), entries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read directory', details: String(err) });
  }
});

// Move (rename) a file or folder. Body: { src: 'relative/path', dest: 'relative/path' }
app.post('/api/move', (req, res) => {
  const { src, dest } = req.body || {};
  if (!src || !dest) return res.status(400).json({ error: 'src and dest required' });

  const srcPath = path.resolve(baseDir, src);
  let destAdjusted = dest;
  // If src looks like a file (has extension) and dest has no .md, append .md
  if (path.extname(srcPath) && !dest.toLowerCase().endsWith('.md')) {
    destAdjusted = dest + '.md';
  }
  const destPath = path.resolve(baseDir, destAdjusted);
  const relSrc = path.relative(baseDir, srcPath);
  const relDest = path.relative(baseDir, destPath);
  if (relSrc.startsWith('..') || relDest.startsWith('..') || path.isAbsolute(relSrc) || path.isAbsolute(relDest)) return res.status(400).json({ error: 'Invalid path' });

  try {
    // Ensure dest directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(srcPath, destPath);
    // Notify clients that files moved
    try { io.emit('files-changed', { action: 'move', src, dest: destAdjusted }); } catch (e) { /* ignore */ }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to move', details: String(err) });
  }
});

// Emit notifications for create/rename/delete endpoints below are already added

// Create a file or folder. Body: { path: 'relative/path', type: 'file'|'folder', content?: string }
app.post('/api/create', (req, res) => {
  let { path: relPath, type, content } = req.body || {};
  if (!relPath || !type) return res.status(400).json({ error: 'path and type required' });

  // Ensure files have .md extension
  if (type === 'file' && !relPath.toLowerCase().endsWith('.md')) {
    relPath = relPath + '.md';
  }

  const target = path.resolve(baseDir, relPath);
  const relCheck = path.relative(baseDir, target);
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) return res.status(400).json({ error: 'Invalid path' });

  try {
    if (type === 'folder') {
      if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    } else {
      // create parent dir if needed
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(target, content || '', 'utf8');
    }
    res.json({ success: true, path: relPath });
    try { io.emit('files-changed', { action: 'create', path: relPath, type }); } catch (e) { }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create', details: String(err) });
  }
});

// Delete a file or folder. Body: { path: 'relative/path' }
app.post('/api/delete', (req, res) => {
  const { path: relPath } = req.body || {};
  if (!relPath) return res.status(400).json({ error: 'path required' });

  const target = path.resolve(baseDir, relPath);
  const relCheck = path.relative(baseDir, target);
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) return res.status(400).json({ error: 'Invalid path' });

  try {
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        fs.rmdirSync(target, { recursive: true });
      } else {
        fs.unlinkSync(target);
      }
    }
    res.json({ success: true });
    try { io.emit('files-changed', { action: 'delete', path: relPath }); } catch (e) { }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete', details: String(err) });
  }
});

// Read a file's contents. Query: ?path=relative/path
app.get('/api/file', (req, res) => {
  const relPath = req.query.path ? String(req.query.path) : null;
  if (!relPath) return res.status(400).json({ error: 'path required' });
  const target = path.resolve(baseDir, relPath);
  const relCheck = path.relative(baseDir, target);
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) return res.status(400).json({ error: 'Invalid path' });
  try {
    if (!fs.existsSync(target)) return res.status(404).json({ error: 'Not found' });
    const stat = fs.statSync(target);
    if (stat.isDirectory()) return res.status(400).json({ error: 'Path is a directory' });
    const content = fs.readFileSync(target, 'utf8');
    res.json({ path: relCheck, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file', details: String(err) });
  }
});

// Write a file's contents. Body: { path: 'relative/path', content: '...' }
app.post('/api/file', (req, res) => {
  const { path: relPath, content } = req.body || {};
  if (!relPath) return res.status(400).json({ error: 'path required' });
  const target = path.resolve(baseDir, relPath);
  const relCheck = path.relative(baseDir, target);
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) return res.status(400).json({ error: 'Invalid path' });
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, typeof content === 'string' ? content : '', 'utf8');
    try { io.emit('files-changed', { action: 'update', path: relCheck }); } catch (e) { }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write file', details: String(err) });
  }
});

// Rename (move) endpoint is already provided as /api/move; keep /api/rename as alias
app.post('/api/rename', (req, res) => {
  const { src, dest } = req.body || {};
  if (!src || !dest) return res.status(400).json({ error: 'src and dest required' });
  const srcPath = path.resolve(baseDir, src);
  let destAdjusted = dest;
  // If src is a file and dest lacks .md, append .md
  if (path.extname(srcPath) && !dest.toLowerCase().endsWith('.md')) {
    destAdjusted = dest + '.md';
  }
  const destPath = path.resolve(baseDir, destAdjusted);
  const relSrc = path.relative(baseDir, srcPath);
  const relDest = path.relative(baseDir, destPath);
  if (relSrc.startsWith('..') || relDest.startsWith('..') || path.isAbsolute(relSrc) || path.isAbsolute(relDest)) return res.status(400).json({ error: 'Invalid path' });
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(srcPath, destPath);
    res.json({ success: true, dest: destAdjusted });
    try { io.emit('files-changed', { action: 'rename', src, dest: destAdjusted }); } catch (e) { }
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename', details: String(err) });
  }
});

// Watch for filesystem changes and emit debounced notifications
try {
  let timer = null;
  fs.watch(baseDir, { recursive: true }, (eventType, filename) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      io.emit('files-changed', { action: 'fswatch', path: filename, eventType });
    }, 200);
  });
} catch (e) {
  console.warn('Failed to start fs.watch for files directory', e);
}
