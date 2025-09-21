import ReactMarkdown from "react-markdown";
import { useEffect, useRef } from "react";
import { useLiveSyncContext } from "./LiveSyncContext";

type EditorProps = {
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
};

export default function Editor(props: EditorProps) {
  const { editing, onEditingChange } = props;
  const { text, setText } = useLiveSyncContext();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      // focus the textarea when we switch into editing mode
      textareaRef.current?.focus();
      // move cursor to end
      const el = textareaRef.current;
      if (el) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [editing]);

  // Fill available space; parent should provide min-h-0 and flex layout
  const editorStyling = "w-full h-full min-h-0 p-2 resize-none font-sans overflow-y-auto bg-transparent cursor-text focus:outline-none";

  switch (editing) {
    case false: return (
      <div
        className={editorStyling}
        tabIndex={0}
        role="button"
        aria-label="Open editor"
        onClick={() => onEditingChange?.(true)}
        onFocus={() => onEditingChange?.(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            onEditingChange?.(true);
          }
        }}
      >
        <ReactMarkdown
          components={{
            h1: ({node, ...rest}) => <h1 className="text-3xl font-bold mt-4 mb-2" {...rest} />,
            h2: ({node, ...rest}) => <h2 className="text-2xl font-bold mt-3 mb-2" {...rest} />,
            h3: ({node, ...rest}) => <h3 className="text-xl font-semibold mt-2 mb-1" {...rest} />,
            h4: ({node, ...rest}) => <h4 className="text-lg font-semibold mt-2 mb-1" {...rest} />,
            h5: ({node, ...rest}) => <h5 className="text-base font-semibold mt-2 mb-1" {...rest} />,
            h6: ({node, ...rest}) => <h6 className="text-sm font-semibold mt-2 mb-1" {...rest} />,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    )
    case true: return (
      <div className="w-full h-full min-h-0">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => onEditingChange?.(true)}
          onBlur={() => onEditingChange?.(false)}
          className={editorStyling}
        />
      </div>
    )
  };
}
