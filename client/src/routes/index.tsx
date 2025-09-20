import { createFileRoute } from '@tanstack/react-router';
import { Editor, StatusIndicator, useLiveSync } from "../components/Editor";

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { text, handleChange, status } = useLiveSync();

  return (
    <div>
      <h1>Live Sync Editor</h1>

      {/* textarea anywhere */}
      <Editor text={text} handleChange={handleChange} />

      {/* status somewhere else */}
      <div style={{ marginTop: "1rem" }}>
        <StatusIndicator status={status} />
      </div>
    </div>
  );
}