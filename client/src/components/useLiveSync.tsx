import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  reconnection: false,
  timeout: 2000,
});

export function useLiveSync() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"waiting" | "saving" | "saved" | "error">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsavedRef = useRef<string | null>(null);

  useEffect(() => {
    socket.on("connect", () => {
      if (unsavedRef.current) saveToServer(unsavedRef.current);
    });

    socket.on("connect_error", () => setStatus("error"));

    socket.on("load-document", (doc: string) => {
      setText(doc);
      setStatus("saved");
    });

    socket.on("receive-changes", (newText: string) => {
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

  const saveToServer = (newText: string) => {
    setStatus("saving");
    let ackCalled = false;

    const timeout = setTimeout(() => {
      if (!ackCalled) {
        setStatus("error");
        unsavedRef.current = newText;
      }
    }, 2000);

    socket.emit("send-changes", newText, (response: { success: boolean; message?: string }) => {
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTitle(newTitle);
    setText(newText);
    setStatus("waiting");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToServer(newText);
    }, 2000);
  };
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTitle(newText);
    setStatus("waiting");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToServer(newText);
    }, 2000);
  };

  return { title, text, handleTitleChange, handleTextChange, status };
}
