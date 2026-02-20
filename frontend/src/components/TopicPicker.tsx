import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Sparkles, RefreshCw, Check } from "lucide-react";
import type { Topic } from "../api/client";
import { createTopic, updateTopic, deleteTopic, suggestTopics, type TopicSuggestion } from "../api/content";
import Modal from "./Modal";

interface TopicPickerProps {
  topics: Topic[];
  value: string;
  onChange: (id: string) => void;
  onTopicsChange: () => void;
  subjectId: string;
  disabled?: boolean;
}

export default function TopicPicker({ topics, value, onChange, onTopicsChange, subjectId, disabled }: TopicPickerProps) {
  const [modal, setModal] = useState<"create" | "edit" | "delete" | "suggestions" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gradeMin, setGradeMin] = useState(1);
  const [gradeMax, setGradeMax] = useState(12);
  const [order, setOrder] = useState(0);

  // AI suggestions state
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addingTopics, setAddingTopics] = useState(false);

  const selected = topics.find((t) => t.id === Number(value));
  const noSubject = !subjectId;

  const openCreate = () => {
    setName("");
    setDescription("");
    setGradeMin(1);
    setGradeMax(12);
    setOrder(0);
    setError("");
    setModal("create");
  };

  const openEdit = () => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description || "");
    setGradeMin(selected.grade_level_min || 1);
    setGradeMax(selected.grade_level_max || 12);
    setOrder(selected.order || 0);
    setError("");
    setModal("edit");
  };

  const openDelete = () => {
    if (!selected) return;
    setError("");
    setModal("delete");
  };

  const openSuggestions = () => {
    setError("");
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setModal("suggestions");
    fetchSuggestions();
  };

  const closeModal = () => {
    setModal(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setError("");
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setError("");
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    try {
      const topics = await suggestTopics(Number(subjectId));
      setSuggestions(topics);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(message || "Failed to generate topic suggestions.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
    }
  };

  const handleAddSelectedTopics = async () => {
    if (!subjectId || selectedSuggestions.size === 0) return;
    setAddingTopics(true);
    setError("");
    try {
      const picked = Array.from(selectedSuggestions).map((i) => suggestions[i]);
      await Promise.all(
        picked.map((s, idx) =>
          createTopic({
            subject: Number(subjectId),
            name: s.name,
            description: s.description,
            grade_level_min: s.grade_level_min,
            grade_level_max: s.grade_level_max,
            order: idx,
          })
        )
      );
      onTopicsChange();
      closeModal();
    } catch {
      setError("Failed to create some topics. Please try again.");
    } finally {
      setAddingTopics(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description,
        grade_level_min: gradeMin,
        grade_level_max: gradeMax,
        order,
      };
      let result: Topic;
      if (modal === "edit" && selected) {
        result = await updateTopic(selected.id, payload);
      } else {
        payload.subject = Number(subjectId);
        result = await createTopic(payload);
      }
      onTopicsChange();
      onChange(String(result.id));
      closeModal();
    } catch {
      setError("Failed to save topic.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await deleteTopic(selected.id);
      onTopicsChange();
      onChange("");
      closeModal();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setError(message || "Failed to delete topic. It may have associated lessons.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {subjectId ? "Select a topic..." : "Select a subject first"}
          </option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button onClick={openCreate} disabled={noSubject} className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Add topic">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={openSuggestions} disabled={noSubject} className="p-2 text-gray-400 hover:text-accent-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Suggest topics with AI">
          <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={openEdit} disabled={noSubject || !value} className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Edit topic">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={openDelete} disabled={noSubject || !value} className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Delete topic">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modal === "create" || modal === "edit"} onClose={closeModal} title={modal === "edit" ? "Edit Topic" : "New Topic"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level Min</label>
              <input
                type="number"
                value={gradeMin}
                onChange={(e) => setGradeMin(Number(e.target.value))}
                min={1}
                max={12}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level Max</label>
              <input
                type="number"
                value={gradeMax}
                onChange={(e) => setGradeMax(Number(e.target.value))}
                min={1}
                max={12}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</div>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl font-semibold">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-primary-600 flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Topic Suggestions Modal */}
      <Modal open={modal === "suggestions"} onClose={closeModal} title="AI Topic Suggestions">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            AI-generated topic suggestions for this subject. Check the ones you'd like to add.
          </p>

          {loadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Sparkles className="w-8 h-8 text-accent-500 animate-pulse" />
              <span className="text-sm text-gray-500">Generating topic suggestions...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  {selectedSuggestions.size === suggestions.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs text-gray-400">
                  {selectedSuggestions.size} of {suggestions.length} selected
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedSuggestions.has(i)
                        ? "border-primary-300 bg-primary-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          selectedSuggestions.has(i)
                            ? "bg-primary-500 border-primary-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedSuggestions.has(i) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => toggleSuggestion(i)}>
                      <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Grades {s.grade_level_min}–{s.grade_level_max}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</div>}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? "animate-spin" : ""}`} />
              Regenerate
            </button>
            <div className="flex items-center gap-3">
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl font-semibold">
                Cancel
              </button>
              <button
                onClick={handleAddSelectedTopics}
                disabled={addingTopics || selectedSuggestions.size === 0 || loadingSuggestions}
                className="bg-primary-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-primary-600 flex items-center gap-2 disabled:opacity-50"
              >
                {addingTopics && <Loader2 className="w-4 h-4 animate-spin" />}
                {addingTopics ? "Adding..." : `Add ${selectedSuggestions.size} Topic${selectedSuggestions.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={modal === "delete"} onClose={closeModal} title="Delete Topic">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{selected?.name}</strong>? This cannot be undone.
          </p>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</div>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl font-semibold">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={saving} className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-600 flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
