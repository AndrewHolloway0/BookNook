import "../global-imports.ts";
import { createFileRoute } from '@tanstack/react-router';
import { useState } from "react";
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { LiveSyncProvider } from "../components/LiveSyncContext";
import Header from "../components/Header";
import Editor from "../components/Editor";

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [editing, setEditing] = useState(true); // start in editing mode

  const toggleEditing = () => setEditing(prev => !prev);

  return (
    <div className="flex flex-row min-h-screen">
      <div className="shadow bg-gray-100 min-w-40 flex flex-col p-4">
        <span className="text-2xl font-bold flex items-center gap-2 mb-4">
          <AutoStoriesIcon />
          BookNook
        </span>
        <nav className="">

        </nav>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <LiveSyncProvider>
          <div className="flex-none">
            <Header editing={editing} onToggle={toggleEditing} />
          </div>
          <div className="flex-1 overflow-auto p-4">
            <Editor editing={editing} onEditingChange={setEditing} />
          </div>
        </LiveSyncProvider>
      </div>
    </div>
  );
}
