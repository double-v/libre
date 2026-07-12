'use client';

import { useState } from 'react';
import AdminSquareBannedWords from '@/components/AdminSquareBannedWords';
import AdminSquareThemes from '@/components/AdminSquareThemes';
import AdminSquareReports from '@/components/AdminSquareReports';

const TABS = [
  { id: 'themes' as const, label: 'Themes & Calendrier', icon: '🎭' },
  { id: 'moderation' as const, label: 'Modération', icon: '🛡' },
  { id: 'reports' as const, label: 'Signalements', icon: '⚑' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AdminSquarePage() {
  const [activeTab, setActiveTab] = useState<TabId>('themes');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-content">La Place</h1>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-coral text-white'
                : 'bg-fill-subtle text-muted hover:bg-fill-subtle'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'themes' && <AdminSquareThemes />}
        {activeTab === 'moderation' && <AdminSquareBannedWords />}
        {activeTab === 'reports' && <AdminSquareReports />}
      </div>
    </div>
  );
}