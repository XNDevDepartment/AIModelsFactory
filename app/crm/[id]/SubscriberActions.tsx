"use client";

import { useState } from "react";
import { Tag, Save, Plus, X } from "lucide-react";

export default function SubscriberActions({
  id,
  tags: initialTags,
  notes: initialNotes,
}: {
  id: string;
  tags: string[];
  notes: string;
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [notes, setNotes] = useState(initialNotes);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setNewTag("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const save = async () => {
    setSaving(true);
    await fetch(`/api/crm/subscribers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags, notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      {/* Tags */}
      <div>
        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Tag className="w-3.5 h-3.5" />
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-300 text-xs"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Add tag…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
          />
          <button
            onClick={addTag}
            disabled={!newTag.trim()}
            className="p-1.5 rounded-lg bg-violet-600/50 hover:bg-violet-600 disabled:opacity-30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-white/40 font-semibold uppercase tracking-wider block mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Private notes about this subscriber…"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600/60 hover:bg-violet-600 disabled:opacity-40 transition-colors text-sm font-medium"
      >
        <Save className="w-4 h-4" />
        {saved ? "Saved!" : saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
