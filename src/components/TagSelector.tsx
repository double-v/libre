'use client';

import { useState } from 'react';
import TagButton from './TagButton';
import type { TagCategory } from '@/lib/taxonomy';

interface TagSelectorProps {
  categories: TagCategory[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export default function TagSelector({
  categories,
  selected,
  onChange,
  placeholder = 'Ajouter...',
  allowCustom = true,
}: TagSelectorProps) {
  const [customInput, setCustomInput] = useState('');

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const tag = customInput.trim();
    if (tag && !selected.includes(tag)) {
      onChange([...selected, tag]);
    }
    setCustomInput('');
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.name}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            {category.name}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {category.items.map((tag) => (
              <TagButton
                key={tag}
                label={tag}
                selected={selected.includes(tag)}
                onClick={() => toggle(tag)}
              />
            ))}
          </div>
        </div>
      ))}

      {allowCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder={placeholder}
            maxLength={30}
            className="flex-1 rounded-full border border-hairline-strong px-3 py-1 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="rounded-full border border-hairline-strong px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-hairline-strong disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}