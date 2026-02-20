import { useState, useCallback } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Download, Trash2, Loader2 } from "lucide-react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export default function CanvasBoard() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleExport = useCallback(async () => {
    if (!excalidrawAPI) return;

    const elements = excalidrawAPI.getSceneElements();
    if (elements.length === 0) return;

    setIsSaving(true);
    try {
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
        exportPadding: 16,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `learning-monk-drawing-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI]);

  const handleClear = useCallback(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.resetScene();
  }, [excalidrawAPI]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)]">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 md:mb-4 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Canvas</h1>
          <p className="text-xs md:text-sm text-gray-500 truncate">
            Draw, sketch, and bring your ideas to life!
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={handleExport}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-all disabled:opacity-40"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Save as PNG</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>
      </div>

      {/* Excalidraw canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="light"
          name="Learning Monk Canvas"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveAsImage: false,
            },
          }}
        />
      </div>
    </div>
  );
}
