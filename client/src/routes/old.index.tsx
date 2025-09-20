import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import CloudUnsavedIcon from "@mui/icons-material/CloudQueue";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import ErrorIcon from "@mui/icons-material/Error";

export const Route = createFileRoute('/old/')({
  component: App,
})

interface SaveResponse {
  success: boolean;
  message?: string;
}

const socket = io("http://localhost:4000", {
  reconnectionAttempts: 1,  // try reconnect 3 times
  timeout: 2000,             // fail if no response in 2s
});

function App() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("saved"); // "waiting" | "saving" | "saved"
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    socket.on("load-document", (doc) => {
      setText(doc);
      setStatus("saved");
    });

    socket.on("receive-changes", (newText) => {
      setText(newText);
      setStatus("saved");
    });

    return () => {
      socket.off("load-document");
      socket.off("receive-changes");
    };
  }, []);

  const handleChange = (e: any) => {
    const newText = e.target.value;
    setText(newText);
    setStatus("waiting");

    if (saveTimer.current) clearTimeout(saveTimer.current);

    // Debounce 2 seconds
    saveTimer.current = setTimeout(() => {
      setStatus("saving"); // now trying to save
      socket.emit("send-changes", newText, (response: SaveResponse) => {
        if (response.success) {
          setStatus("saved");
        } else {
          setStatus("error");
          console.error(response.message);
        }
      });
    }, 2000);
  };

  const renderStatus = () => {
    switch (status) {
      case "waiting":
        return (
          <span style={{ color: "orange" }}>
            <CloudUnsavedIcon fontSize="small" /> Unsaved Changes...
          </span>
        );
      case "saving":
        return (
          <span style={{ color: "blue" }}>
            <CloudSyncIcon fontSize="small" /> Uploading Changes...
          </span>
        );
      case "error":
        return (
          <span style={{ color: "red" }}>
            <ErrorIcon fontSize="small" /> There was an error syncing.
          </span>
        );
      case "saved":
        return (
          <span style={{ color: "green" }}>
            <CloudDoneIcon fontSize="small" /> Cloud Synced
          </span>
        );
      default:
      return null;
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Live Sync Text</h1>
      <textarea
        value={text}
        onChange={handleChange}
        style={{ width: "100%", height: "300px" }}
      />
      <div style={{ marginTop: "8px", fontStyle: "italic" }}>{renderStatus()}</div>
    </div>
  );
}
