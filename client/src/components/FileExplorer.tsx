import { useEffect, useState } from 'react';
import { io as ioClient } from 'socket.io-client';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';

type Props = {
  onSelect?: (path: string) => void;
  selectedPath?: string | null;
};

type Entry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

export default function FileExplorer(props: Props) {
  const { onSelect, selectedPath } = props;
  const [tree, setTree] = useState<Record<string, Array<Entry>>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: Entry } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Entry | null>(null);

  // Load root on mount
  useEffect(() => {
    ensureLoaded('.');
    const socket = ioClient('http://localhost:4000');
    socket.on('connect', () => console.log('file-explorer connected'));
    socket.on('files-changed', async (msg: any) => {
      // If message contains path info, refresh its parent; otherwise refresh root
      try {
        if (msg && msg.path) {
          const parent = msg.path.includes('/') ? msg.path.substring(0, msg.path.lastIndexOf('/')) : '.';
          setTree((t) => ({ ...t, [parent]: [] }));
          await ensureLoaded(parent || '.');
        } else {
          // refresh root
          setTree({});
          await ensureLoaded('.');
        }
      } catch (e) { console.warn(e); }
    });
    return () => { socket.disconnect(); };
  }, []);

  async function load(path = '.') {
    const q = new URLSearchParams();
    if (path && path !== '.') q.set('path', path);
    const res = await fetch(`http://localhost:4000/api/files?${q.toString()}`);
  if (!res.ok) return [] as Array<Entry>;
    const data = await res.json();
    return data.entries || [];
  }

  // Ensure the given path is loaded; recursively load all child directories so the tree is always expanded
  async function ensureLoaded(path = '.') {
    // Avoid re-loading a path that already has entries
    if (Array.isArray(tree[path]) && tree[path].length > 0) return;
    try {
      const entries = await load(path);
      setTree((t) => ({ ...t, [path]: entries }));
      // Recursively ensure children directories are loaded (permanently expanded)
      for (const e of entries) {
        if (e.isDirectory) {
          await ensureLoaded(e.path);
        }
      }
    } catch (err) {
      console.warn('Failed to ensure Loaded', path, err);
    }
  }

  function basename(p: string) {
    const parts = p.split('/');
    return parts[parts.length - 1] || p;
  }

  function displayNameFor(entryOrName: Entry | string) {
    const name = typeof entryOrName === 'string' ? entryOrName : entryOrName.name;
    // hide trailing .md for files
    if (name.toLowerCase().endsWith('.md')) return name.slice(0, -3);
    return name;
  }

  function parentOf(p: string) {
    if (!p) return '.';
    const i = p.lastIndexOf('/');
    if (i === -1) return '.';
    return p.substring(0, i) || '.';
  }

  function onDragStart(e: React.DragEvent, entry: Entry) {
    e.dataTransfer.setData('text/plain', entry.path);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDrop(e: React.DragEvent, targetPath: string) {
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain');
    if (!src) return;
    const name = basename(src);
    const dest = targetPath === '.' ? name : `${targetPath}/${name}`;

    await fetch('http://localhost:4000/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src, dest }),
    });

    // refresh affected parents
    const srcParent = parentOf(src);
    const destParent = parentOf(dest);
    const updates: Record<string, Array<Entry>> = {};
    updates[srcParent] = await load(srcParent);
    if (destParent !== srcParent) updates[destParent] = await load(destParent);
    setTree((t) => ({ ...t, ...updates }));
  }

  function renderEntries(path = '.', level = 0) {
    const entries = tree[path] ?? [];
    return (
      <ul role="group">
        {entries.map((entry) => (
          <li key={entry.path}>
            <div
              draggable
              onDragStart={(e) => onDragStart(e, entry)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => entry.isDirectory ? handleDrop(e, entry.path) : handleDrop(e, parentOf(entry.path))}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, entry });
              }}
              onClick={() => { if (!entry.isDirectory) { if (selectedPath === entry.path) onSelect?.(null as any); else onSelect?.(entry.path); } }}
              className={"flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 " + (selectedPath === entry.path ? 'bg-blue-100 font-semibold dark:text-gray-900' : '')}
            >
              <span className="select-none">{entry.isDirectory ? <FolderIcon /> : <DescriptionIcon />}</span>
              <span className="flex-1 truncate">{displayNameFor(entry)}</span>
            </div>
            <div className="pl-3 border-l">
              {renderEntries(entry.path, level + 1)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <nav className="w-64 p-2 overflow-auto">
      {renderEntries('.')}
      {/* Context menu */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed bg-white border rounded shadow p-1 z-50 dark:bg-gray-800"
        >
          <button
            className="block px-3 py-1 text-left w-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={async () => {
              // rename: prompt without extension, then send dest with .md appended for files
              const prefill = displayNameFor(contextMenu.entry);
              const newName = window.prompt('New name', prefill);
              setContextMenu(null);
              if (!newName) return;
              const destParent = parentOf(contextMenu.entry.path);
              let dest = destParent === '.' ? newName : `${destParent}/${newName}`;
              if (!contextMenu.entry.isDirectory) dest = dest + '.md';
              await fetch('http://localhost:4000/api/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src: contextMenu.entry.path, dest }) });
              const parent = parentOf(contextMenu.entry.path);
              const updated = await load(parent);
              setTree((t) => ({ ...t, [parent]: updated }));
            }}
          >Rename</button>
          <button
            className="block px-3 py-1 text-left w-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              setConfirmDelete(contextMenu.entry);
              setContextMenu(null);
            }}
          >Delete</button>
          <button className="block px-3 py-1 text-left w-full hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setContextMenu(null)}>Cancel</button>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setConfirmDelete(null)} />
          <div className="bg-white p-4 rounded shadow z-10 dark:bg-gray-800">
            <div className="mb-4">Delete <strong>{displayNameFor(confirmDelete.name)}</strong>?</div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-red-600" onClick={async () => {
                const entry = confirmDelete;
                setConfirmDelete(null);
                await fetch('http://localhost:4000/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: entry.path }) });
                const parent = parentOf(entry.path);
                const updated = await load(parent);
                setTree((t) => ({ ...t, [parent]: updated }));
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* <div className="mt-4 text-sm text-gray-500">Tip: drag file onto folder to move. Click folder arrow to expand. Right-click item for rename/delete.</div> */}
    </nav>
  );
}
