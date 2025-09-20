import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

type Status = "waiting" | "saving" | "saved" | "error";

interface LiveSyncContextType {
  title: string;
  text: string;
  setTitle: (t: string) => void;
  setText: (t: string) => void;
  status: Status;
}

const LiveSyncContext = createContext<LiveSyncContextType | undefined>(undefined);

export const LiveSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("saved");
  const socketRef = useRef<Socket | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsavedRef = useRef(false); // track if we had unsaved edits

  useEffect(() => {
    const socket = io("http://localhost:4000", { autoConnect: true, reconnection: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to server");
      if (unsavedRef.current) {
        // Push local unsaved text back up
        setStatus("saving");
        socket.emit("send-changes", text, (response: any) => {
          if (response?.success) {
            setStatus("saved");
            unsavedRef.current = false;
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

    socket.on("load-document", (doc) => setText(doc));

    socket.on("receive-changes", (newText) => {
      setText(newText);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    setStatus("waiting");

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      setStatus("saving");
      socketRef.current?.emit("send-changes", newText, (response: any) => {
        if (response?.success) {
          setStatus("saved");
        } else {
          setStatus("error");
        }
      });
    }, 2000);
  };

  const handleTitleChange = (newText: string) => {
    setTitle(newText);
    setStatus("waiting");

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      setStatus("saving");
      socketRef.current?.emit("send-changes", newText, (response: any) => {
        if (response?.success) {
          setStatus("saved");
        } else {
          setStatus("error");
        }
      });
    }, 2000);
  };

  return (
    <LiveSyncContext.Provider value={{ title, setTitle: handleTitleChange, text, setText: handleTextChange, status }}>
      {children}
    </LiveSyncContext.Provider>
  );
};

export const useLiveSyncContext = () => {
  const ctx = useContext(LiveSyncContext);
  if (!ctx) throw new Error("useLiveSyncContext must be used inside LiveSyncProvider");
  return ctx;
};
