import { createFileRoute } from '@tanstack/react-router';
import { LiveSyncProvider } from "../components/LiveSyncContext";
import Header from "../components/Header";
import Editor from "../components/Editor";

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div>
      <LiveSyncProvider>
        <Header />
        <Editor />
      </LiveSyncProvider>
      <LiveSyncProvider>
        <Header />
        <Editor />
      </LiveSyncProvider>
    </div>
  );
}
