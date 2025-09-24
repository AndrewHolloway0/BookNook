import "../global-imports.ts";
import { createFileRoute } from '@tanstack/react-router';
import { useState } from "react";
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { LiveSyncProvider } from "../components/LiveSyncContext";
import Header from "../components/Header";
import Editor from "../components/Editor";
import FileExplorer from "../components/FileExplorer";

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [editing, setEditing] = useState(false); // start in viewing mode
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('booknook_dark');
      return v === '1';
    } catch (e) { return false; }
  });

  const toggleEditing = () => setEditing(prev => !prev);

  return (
    <div className="flex flex-row min-h-screen dark:text-white dark:bg-gray-900">
      <div className="shadow bg-gray-100 min-w-40 items-center flex flex-col p-4 dark:bg-gray-800">
        <span className="text-2xl font-bold flex items-center gap-2 mb-4">
          <AutoStoriesIcon />
          BookNook
          <button
            className="ml-2 text-sm px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={() => {
              const next = !darkMode;
              setDarkMode(next);
              try { localStorage.setItem('booknook_dark', next ? '1' : '0'); } catch (e) {}
              if (next) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
            }}
            title="Toggle dark mode"
          >{darkMode ? '🌙' : '☀️'}</button>
        </span>
        <nav className="flex-1 overflow-auto">
          <FileExplorer onSelect={(p) => setSelectedFile(p)} selectedPath={selectedFile} />
        </nav>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-2">
        <LiveSyncProvider filePath={selectedFile}>
          <div className={selectedFile ? "flex-none sticky top-0 bg-white z-100 py-2 px-4 shadow rounded dark:bg-gray-800" : "hidden"}>
            <Header editing={editing} onToggle={toggleEditing} filePath={selectedFile} />
          </div>
          <div className="flex-1 overflow-auto p-4 w-[83%] mx-auto">
            <Editor editing={editing} />
          </div>
        </LiveSyncProvider>
      </div>
    </div>
  );
}

// Pass selection handler to FileExplorer by updating its usage in the sidebar
