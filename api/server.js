// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const FILE_PATH = path.join(__dirname, "document.md");

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

  socket.emit("load-document", documentText);

  socket.on("send-changes", (delta, callback) => {
    documentText = delta;

    // Broadcast changes to other clients immediately
    socket.broadcast.emit("receive-changes", delta);

    // Mimic slow save
    try {
      saveDocument(documentText); // your save function
      callback({ success: true }); // tell frontend save is done
    } catch (err) {
      callback({ success: false, message: "Failed to save document" });
    }
  });
});

server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);
