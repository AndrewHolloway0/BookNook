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

export const LiveSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("saved");
  const socketRef = useRef<Socket | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsavedRef = useRef(false); // track if we had unsaved edits

  useEffect(() => {
    // On mount, check for unsaved text in localStorage
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
      socket.disconnect();
    };
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    setStatus("waiting");
    localStorage.setItem("livesync_unsaved_text", newText);

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      setStatus("saving");
      socketRef.current?.emit("send-changes", newText, (response: any) => {
        if (response?.success) {
          setStatus("saved");
          localStorage.removeItem("livesync_unsaved_text");
        } else {
          setStatus("error");
        }
      });
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
