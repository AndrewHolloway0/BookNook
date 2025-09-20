

import ReactMarkdown from "react-markdown";
import { useLiveSyncContext } from "./LiveSyncContext";

export default function Editor() {
  const { text, setText } = useLiveSyncContext();

  return (
    <div className="flex gap-8">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        className="w-1/2 h-72 p-2 border border-gray-300 rounded resize-none font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <div className="w-1/2 h-72 overflow-y-auto border border-gray-300 rounded bg-gray-50 p-4">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-4 mb-2" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-3 mb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-2 mb-1" {...props} />,
            h4: ({node, ...props}) => <h4 className="text-lg font-semibold mt-2 mb-1" {...props} />,
            h5: ({node, ...props}) => <h5 className="text-base font-semibold mt-2 mb-1" {...props} />,
            h6: ({node, ...props}) => <h6 className="text-sm font-semibold mt-2 mb-1" {...props} />,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
