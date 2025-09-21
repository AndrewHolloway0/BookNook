import ErrorIcon from "@mui/icons-material/Error";
import CloudUnsavedIcon from "@mui/icons-material/CloudQueue";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";
import { useLiveSyncContext } from "./LiveSyncContext";

type EditorProps = {
  editing: boolean;
  onToggle?: () => void;
};

export default function Header(props: EditorProps) {
  const { editing, onToggle } = props;
  const { status } = useLiveSyncContext();

  return (
    <header className="flex place-content-end items-center gap-2">
      <span>
        {EditIndicator(editing, onToggle)}
      </span>
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

function EditIndicator(editing: boolean, onToggle?: () => void) {
  const buttonStyling = "p-1 rounded border-2 border-gray-300 bg-gray-200 text-gray-500 flex items-center gap-1";

  if (editing) {
    return (
      <button
        onClick={onToggle}
        aria-pressed="true"
        title="Toggle editing"
        className={buttonStyling}
      >
        <EditIcon fontSize="small" />
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      aria-pressed="false"
      title="Toggle editing"
      className={buttonStyling}
    >
      <EditOffIcon fontSize="small" />
    </button>
  );
}