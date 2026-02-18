import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, ArrowLeft, Loader2 } from "lucide-react";
import { createSession } from "../../api/math";
import { useAuthStore } from "../../stores/authStore";
import { cn } from "../../utils/cn";

const TOPIC_PRESETS = [
  "Addition & Subtraction",
  "Multiplication & Division",
  "Fractions",
  "Decimals",
  "Geometry",
  "Algebra",
  "Word Problems",
  "Measurement",
  "Percentages",
  "Ratios",
];

export default function MathPracticeNew() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const grade = user?.kid_profile?.grade_level ?? 4;
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (selectedTopic: string) => {
    if (!selectedTopic.trim() || creating) return;
    setCreating(true);
    try {
      const session = await createSession(selectedTopic.trim());
      navigate(`/math-practice/${session.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate("/math-practice")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
            New Practice Session
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 mb-1">
          Grade {grade} math practice
        </p>
        <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-display)" }}>
          What do you want to practice?
        </h2>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TOPIC_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => handleCreate(t)}
              disabled={creating}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300",
                "disabled:opacity-40"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Custom topic */}
        <div className="border-t border-gray-100 pt-5">
          <label className="text-sm font-medium text-gray-600 mb-2 block">
            Or type your own topic:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate(topic)}
              placeholder="e.g., Long division, Area of triangles..."
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 text-sm"
            />
            <button
              onClick={() => handleCreate(topic)}
              disabled={!topic.trim() || creating}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-all disabled:opacity-40 flex items-center gap-2 text-sm shrink-0"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
