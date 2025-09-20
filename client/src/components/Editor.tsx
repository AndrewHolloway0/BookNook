import { useLiveSyncContext } from "./LiveSyncContext";

export default function Editor() {
  const { title, text, setTitle, setText } = useLiveSyncContext();

  return (
    <div>
      <textarea
        style={{ width: "100%", height: "20px" }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        style={{ width: "100%", height: "300px" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}
