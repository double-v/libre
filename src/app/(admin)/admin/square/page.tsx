'use client';

import { useState } from 'react';
import AdminSquareBannedWords from '@/components/AdminSquareBannedWords';
import AdminSquareThemes from '@/components/AdminSquareThemes';
import AdminSquareReports from '@/components/AdminSquareReports';
import AdminSquareAvailability from '@/components/AdminSquareAvailability';

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
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">La Place</h1>

      <AdminSquareAvailability />

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
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