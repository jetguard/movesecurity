import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  ListItemNode,
} from "@lexical/list";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="flex flex-wrap gap-2 border-b bg-gray-50 p-2">
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} className="px-3 py-1 bg-white border rounded">
        Negrito
      </button>

      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} className="px-3 py-1 bg-white border rounded">
        Itálico
      </button>

      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} className="px-3 py-1 bg-white border rounded">
        Sublinhado
      </button>

      <button type="button" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} className="px-3 py-1 bg-white border rounded">
        Lista
      </button>

      <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} className="px-3 py-1 bg-white border rounded">
        Desfazer
      </button>

      <button type="button" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} className="px-3 py-1 bg-white border rounded">
        Refazer
      </button>
    </div>
  );
}

export default function LexicalEditor({ onChange }: Props) {
  const initialConfig = {
    namespace: "JetGuardEditor",
    nodes: [ListNode, ListItemNode],
    theme: {
      paragraph: "mb-2",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
      },
      list: {
        ul: "list-disc ml-6",
        listitem: "mb-1",
      },
    },
    onError(error: Error) {
      console.error(error);
    },
  };

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="border-b bg-gray-100 px-4 py-2 font-semibold">
        Relato Segurança Patrimonial
      </div>

      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />

        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[300px] p-4 outline-none" />
            }
            placeholder={
              <div className="absolute left-4 top-4 text-gray-400 pointer-events-none">
                Digite o relato...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          <HistoryPlugin />
          <ListPlugin />

          <OnChangePlugin
            onChange={(editorState) => {
              editorState.read(() => {
                const texto = $getRoot().getTextContent();
                onChange(texto);
              });
            }}
          />
        </div>
      </LexicalComposer>
    </div>
  );
}