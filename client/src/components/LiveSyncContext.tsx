import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

type Status = "waiting" | "saving" | "saved" | "error";

interface LiveSyncContextType {
  text: string;
  setText: (t: string) => void;
  status: Status;
}

const LiveSyncContext = createContext<LiveSyncContextType | undefined>(undefined);

export const LiveSyncProvider: React.FC<{ children: React.ReactNode, filePath?: string | null }> = ({ children, filePath = null }) => {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("saved");
  const socketRef = useRef<Socket | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsavedRef = useRef(false); // track if we had unsaved edits

  useEffect(() => {
    // Clear any pending save when switching modes
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    // If a filePath is provided, load that file from REST API and operate in file-backed mode
    if (filePath) {
      // Disconnect any socket if present
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch (e) { }
        socketRef.current = null;
      }

      (async () => {
        try {
          setStatus('waiting');
          const res = await fetch(`http://localhost:4000/api/file?path=${encodeURIComponent(filePath)}`);
          if (res.ok) {
            const data = await res.json();
            setText(data.content ?? '');
            localStorage.setItem('livesync_unsaved_text', data.content ?? '');
            unsavedRef.current = false;
            setStatus('saved');
          } else if (res.status === 404) {
            setText('');
            setStatus('saved');
          } else {
            setText('');
            setStatus('error');
          }
        } catch (e) {
          console.warn('Failed to load file', e);
          setStatus('error');
        }
      })();

      return () => {
        // noop: nothing to clean specifically for file-backed mode
      };
    }

    // --- socket-backed document behavior ---
    // On mount / when filePath is unset, use socket-backed live document
    const localUnsaved = localStorage.getItem("livesync_unsaved_text");
    if (localUnsaved !== null) {
      setText(localUnsaved);
      unsavedRef.current = true;
    }

    const socket = io("http://localhost:4000", { autoConnect: true, reconnection: true });
    socketRef.current = socket;

    let didConnect = false;
    const connectTimeout = setTimeout(() => {
      if (!didConnect) setStatus("error");
    }, 3000); // 3s timeout for initial connection

    socket.on("connect", () => {
      didConnect = true;
      clearTimeout(connectTimeout);
      console.log("✅ Connected to server");
      if (unsavedRef.current) {
        // Push local unsaved text back up
        setStatus("saving");
        socket.emit("send-changes", localStorage.getItem("livesync_unsaved_text") ?? text, (response: any) => {
          if (response?.success) {
            setStatus("saved");
            unsavedRef.current = false;
            localStorage.removeItem("livesync_unsaved_text");
          } else {
            setStatus("error");
          }
        });
      } else {
        // No unsaved changes -> reload doc from server
        socket.emit("request-document");
      }
    });

    socket.on("disconnect", () => setStatus("error"));

    socket.on("load-document", (doc) => {
      // Only overwrite if there are no unsaved local changes
      if (!localStorage.getItem("livesync_unsaved_text")) {
        setText(doc);
        localStorage.setItem("livesync_unsaved_text", doc);
      }
    });

    socket.on("receive-changes", (newText) => {
      // Only overwrite if there are no unsaved local changes
      if (!localStorage.getItem("livesync_unsaved_text")) {
        setText(newText);
        localStorage.setItem("livesync_unsaved_text", newText);
      }
    });

    return () => {
      clearTimeout(connectTimeout);
      try { socket.disconnect(); } catch (e) { }
      socketRef.current = null;
    };
  }, [filePath]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    setStatus("waiting");
    localStorage.setItem("livesync_unsaved_text", newText);

    if (saveTimer.current) clearTimeout(saveTimer.current);

    // If filePath is provided, save to REST endpoint; otherwise use socket send-changes
    saveTimer.current = setTimeout(async () => {
      setStatus('saving');
      if (filePath) {
        try {
          const resp = await fetch('http://localhost:4000/api/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: filePath, content: newText }) });
          if (resp.ok) {
            setStatus('saved');
            localStorage.removeItem('livesync_unsaved_text');
          } else {
            setStatus('error');
          }
        } catch (e) {
          console.warn('Failed to save file', e);
          setStatus('error');
        }
      } else {
        socketRef.current?.emit('send-changes', newText, (response: any) => {
          if (response?.success) {
            setStatus('saved');
            localStorage.removeItem('livesync_unsaved_text');
          } else {
            setStatus('error');
          }
        });
      }
    }, 2000);
  };

  return (
    <LiveSyncContext.Provider value={{ text, setText: handleTextChange, status }}>
      {children}
    </LiveSyncContext.Provider>
  );
};

export const useLiveSyncContext = () => {
  const ctx = useContext(LiveSyncContext);
  if (!ctx) throw new Error("useLiveSyncContext must be used inside LiveSyncProvider");
  return ctx;
};
