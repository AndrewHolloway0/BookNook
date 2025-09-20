import ErrorIcon from "@mui/icons-material/Error";
import CloudUnsavedIcon from "@mui/icons-material/CloudQueue";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import { useLiveSyncContext } from "./LiveSyncContext";


export default function Header() {
  const { status } = useLiveSyncContext();

  return (
    <header className="flex items-center gap-2">
      <span>Status:</span>
      <span>{StatusIndicator(status)}</span>
    </header>
  );
}

function StatusIndicator(status: string) {
  switch (status) {
    case "waiting":
      return <span className="text-gray-500 flex items-center gap-1"><CloudUnsavedIcon fontSize="small" /> Unsaved Changes...</span>;
    case "saving":
      return <span className="text-blue-500 flex items-center gap-1"><CloudSyncIcon fontSize="small" /> Uploading Changes...</span>;
    case "saved":
      return <span className="text-green-600 flex items-center gap-1"><CloudDoneIcon fontSize="small" /> Cloud Synced</span>;
    case "error":
      return <span className="text-red-500 flex items-center gap-1"><ErrorIcon fontSize="small" /> Server Error.</span>;
    default:
      return null;
  }
}