import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import CloudUnsavedIcon from "@mui/icons-material/CloudQueue";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import ErrorIcon from "@mui/icons-material/Error";

interface SaveResponse {
  success: boolean;
  message?: string;
}

const socket = io("http://localhost:4000", { reconnectionAttempts: Infinity });

export function useLiveSync() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("saved");
  const saveTimer = useRef<number | null>(null);
  const unsavedRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      if (unsavedRef.current) saveToServer(unsavedRef.current);
    });

    socket.on("connect_error", () => setStatus("error"));

    socket.on("load-document", (doc) => {
      setText(doc);
      setStatus("saved");
    });

    socket.on("receive-changes", (newText) => {
      setText(newText);
      setStatus("saved");
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("load-document");
      socket.off("receive-changes");
    };
  }, []);

  const saveToServer = (newText: SaveResponse) => {
    setStatus("saving");
    let ackCalled = false;

    const timeout = setTimeout(() => {
      if (!ackCalled) {
        setStatus("error");
        unsavedRef.current = newText;
      }
    }, 2000);

    socket.emit("send-changes", newText, (response: SaveResponse) => {
      ackCalled = true;
      clearTimeout(timeout);
      if (response.success) {
        setStatus("saved");
        unsavedRef.current = null;
      } else {
        setStatus("error");
        unsavedRef.current = newText;
      }
    });
  };

  const handleChange = (e: any) => {
    const newText = e.target.value;
    setText(newText);
    setStatus("waiting");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToServer(newText);
    }, 2000);
  };

  return { text, setText, handleChange, status };
}

export function Editor({ text, handleChange }) {
  return (
    <textarea
      value={text}
      onChange={handleChange}
      style={{ width: "100%", height: "300px" }}
    />
  );
}

export function StatusIndicator({ status }) {
  switch (status) {
    case "waiting":
      return <span style={{ color: "orange" }}><CloudUnsavedIcon fontSize="small" /> Unsaved Changes...</span>;
    case "saving":
      return <span style={{ color: "blue" }}><CloudSyncIcon fontSize="small" /> Uploading Changes...</span>;
    case "saved":
        return <span style={{ color: "green" }}><CloudDoneIcon fontSize="small" /> Cloud Synced</span>;
    case "error":
        return <span style={{ color: "red" }}><ErrorIcon fontSize="small" /> There was an error syncing.</span>;
    default:
      return null;
  }
}
