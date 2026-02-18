import { Construction } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="text-6xl mb-4">⚙️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-500 mb-4">Configure MindCraft. Coming soon.</p>
        <div className="inline-flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-sm font-medium">
          <Construction className="w-4 h-4" /> Under Construction
        </div>
      </div>
    </div>
  );
}
