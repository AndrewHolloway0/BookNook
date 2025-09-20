import { CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CloudUnsavedIcon from "@mui/icons-material/CloudQueue";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import { useLiveSyncContext } from "./LiveSyncContext";

export default function Header() {
  const { status } = useLiveSyncContext();

  let indicator = null;
  if (status === "saving") indicator = <CircularProgress size={16} />;
  if (status === "saved") indicator = <CheckCircleIcon color="success" />;
  if (status === "error") indicator = <ErrorIcon color="error" />;

  return (
    <header style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span>Status:</span>
      {<span>{StatusIndicator(status)}</span>}
    </header>
  );
}

function StatusIndicator(status: string) {
  switch (status) {
    case "waiting":
      return <span style={{ color: "gray" }}><CloudUnsavedIcon fontSize="small" /> Unsaved Changes...</span>;
    case "saving":
      return <span style={{ color: "blue" }}><CloudSyncIcon fontSize="small" /> Uploading Changes...</span>;
    case "saved":
        return <span style={{ color: "green" }}><CloudDoneIcon fontSize="small" /> Cloud Synced</span>;
    case "error":
        return <span style={{ color: "red" }}><ErrorIcon fontSize="small" /> Server Error.</span>;
    default:
      return null;
  }
}