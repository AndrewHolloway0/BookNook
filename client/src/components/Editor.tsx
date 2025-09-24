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

  // Fill available space; parent should provide min-h-0 and flex layout
  const editorStyling = "w-full h-full min-h-0 p-2 resize-none font-sans overflow-y-auto bg-transparent cursor-text focus:outline-none";

  switch (editing) {
    case false: return (
      <div className={editorStyling}>
        <ReactMarkdown
          components={{
            h1: ({node, ...rest}) => <h1 className="text-3xl font-bold mt-6 mb-2" {...rest} />,
            h2: ({node, ...rest}) => <h2 className="text-2xl font-bold mt-5 mb-2" {...rest} />,
            h3: ({node, ...rest}) => <h3 className="text-xl font-semibold mt-4 mb-1" {...rest} />,
            h4: ({node, ...rest}) => <h4 className="text-lg font-semibold mt-4 mb-1" {...rest} />,
            h5: ({node, ...rest}) => <h5 className="text-base font-semibold mt-3 mb-1" {...rest} />,
            h6: ({node, ...rest}) => <h6 className="text-sm font-semibold mt-3 mb-1" {...rest} />,
            a: ({node, ...rest}) => (
              <a {...rest} className={`text-blue-400 underline hover:text-blue-300`} target="_blank" rel="noopener noreferrer" />
            ),
            code: ({node, ...rest}) => (
              <code className="bg-gray-100 px-1 rounded text-sm font-mono text-gray-800 dark:bg-gray-800 dark:text-white" {...rest} />
            ),
            p: ({node, ...rest}) => (
              <p className="my-2" {...rest} />
            ),
            hr: ({node, ...rest}) => (
              <hr className="my-4" {...rest} />
            ),
            ol: ({node, ...rest}) => (
              <ol className="list-decimal list-inside" {...rest} />
            ),
            ul: ({node, ...rest}) => (
              <ul className="list-disc list-inside" {...rest} />
            ),
            li: ({node, ...rest}) => (
              <li className="px-4" {...rest} />
            ),
            blockquote: ({node, ...rest}) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 my-2 text-gray-600 dark:border-gray-700 dark:text-gray-400" {...rest} />
            ),
            pre: (codeProps: any) => {
              const { children } = codeProps;
              const copyId = 'copy-btn-' + '-' + Math.floor(Math.random() * 1000000);
              const codeText = children.props.children;

              return (
                <div className="relative shadow bg-gray-900 text-gray-100 p-3 rounded overflow-auto my-2 dark:bg-gray-800">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(codeText);
                        const el = document.getElementById(copyId);
                        if (el) {
                          const prev = el.innerText;
                          el.innerText = 'Copied';
                          setTimeout(() => { el.innerText = prev; }, 1200);
                        }
                      } catch (e) {
                        console.warn('Copy failed', e);
                      }
                    }}
                    id={copyId}
                    className="absolute right-2 top-2 z-5 bg-white text-sm px-2 py-1 rounded shadow border hover:bg-gray-50"
                    aria-label="Copy code"
                  >Copy</button>
                  <pre className="" {...codeProps}>
                    <code className="font-mono">
                      {children}
                    </code>
                  </pre>
                </div>
              )
            },
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
          className={editorStyling}
        />
      </div>
    )
  };
}
