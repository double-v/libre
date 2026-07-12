'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from './ui/Card';

interface ThemeConfig {
  id: string;
  themeId: string;
  label: string;
  description: string;
  inputType: string;
  placeholder: string;
  maxLength: number;
  allowFreeText: boolean;
  options: string[] | null;
  pseudonymNames: string[] | null;
  active: boolean;
}

type ThemeForm = Pick<
  ThemeConfig,
  'label' | 'description' | 'placeholder' | 'maxLength' | 'allowFreeText' | 'options' | 'pseudonymNames' | 'active'
>;

interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  themeConfigId: string;
  themeConfig: ThemeConfig;
}

const DAYS_FR: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

export default function AdminSquareThemes() {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ThemeForm>>({});

  // Schedule edit state
  const [scheduleDraft, setScheduleDraft] = useState<Record<number, string>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/square/themes');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setThemes(data.themes);
      setSchedule(data.schedule);
      // Initialize schedule draft from fetched data
      const draft: Record<number, string> = {};
      for (let d = 0; d < 7; d++) {
        const slot = data.schedule.find((s: ScheduleSlot) => s.dayOfWeek === d);
        draft[d] = slot?.themeConfigId ?? '';
      }
      setScheduleDraft(draft);
    } catch {
      setError('Erreur lors du chargement des thèmes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch au montage : IIFE async → aucun setState synchrone dans le corps
    // de l'effet (react-hooks/set-state-in-effect, cf. #179/#193).
    void (async () => { await fetchData(); })();
  }, [fetchData]);

  const startEdit = (theme: ThemeConfig) => {
    setEditingId(theme.id);
    setEditForm({
      label: theme.label,
      description: theme.description,
      placeholder: theme.placeholder,
      maxLength: theme.maxLength,
      allowFreeText: theme.allowFreeText,
      active: theme.active,
      options: theme.options ?? [],
      pseudonymNames: theme.pseudonymNames ?? [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const body: Record<string, unknown> = {};
      // Only send changed fields
      const original = themes.find((t) => t.id === id);
      if (!original) return;

      if (editForm.label !== original.label) body.label = editForm.label;
      if (editForm.description !== original.description) body.description = editForm.description;
      if (editForm.placeholder !== original.placeholder) body.placeholder = editForm.placeholder;
      if (editForm.maxLength !== original.maxLength) body.maxLength = editForm.maxLength;
      if (editForm.allowFreeText !== original.allowFreeText) body.allowFreeText = editForm.allowFreeText;
      if (editForm.active !== original.active) body.active = editForm.active;

      // Handle array fields — always send even if unchanged since they're textareas
      const options = editForm.options ?? [];
      body.options = options.length > 0 ? options : null;

      const pseudonyms = editForm.pseudonymNames ?? [];
      body.pseudonymNames = pseudonyms.length > 0 ? pseudonyms : null;

      const res = await fetch(`/api/admin/square/themes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSuccess('Thème mis à jour.');
      setEditingId(null);
      setEditForm({});
      fetchData();
    } catch {
      setError('Erreur lors de la sauvegarde.');
    }
  };

  const handleSaveSchedule = async () => {
    setError('');
    setSuccess('');
    setSavingSchedule(true);
    try {
      const schedulePayload = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        themeConfigId: scheduleDraft[i],
      }));

      const res = await fetch('/api/admin/square/themes/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: schedulePayload }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur');
      }
      setSuccess('Calendrier mis à jour.');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du calendrier.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const arrayToTextarea = (arr: string[] | null | undefined): string =>
    (arr ?? []).join('\n');

  const textareaToArray = (val: string): string[] =>
    val.split('\n').map((s) => s.trim()).filter(Boolean);

  if (loading) return <p className="text-muted">Chargement...</p>;

  return (
    <div className="space-y-8">
      {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">{success}</div>}

      {/* Themes list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-content">Thèmes</h2>
        <div className="space-y-3">
          {themes.map((theme) => (
            <Card key={theme.id} variant="profile">
              {editingId === theme.id ? (
                /* Edit form */
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Label</label>
                    <input
                      type="text"
                      value={editForm.label ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Description</label>
                    <textarea
                      value={editForm.description ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Placeholder</label>
                    <input
                      type="text"
                      value={editForm.placeholder ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, placeholder: e.target.value })}
                      className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted">Longueur max</label>
                      <input
                        type="number"
                        value={editForm.maxLength ?? 200}
                        onChange={(e) => setEditForm({ ...editForm, maxLength: Number(e.target.value) })}
                        className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.allowFreeText ?? false}
                          onChange={(e) => setEditForm({ ...editForm, allowFreeText: e.target.checked })}
                          className="rounded"
                        />
                        Texte libre
                      </label>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.active ?? true}
                          onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                          className="rounded"
                        />
                        Actif
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Options (une par ligne)</label>
                    <textarea
                      value={arrayToTextarea(editForm.options ?? null)}
                      onChange={(e) => setEditForm({ ...editForm, options: textareaToArray(e.target.value) })}
                      rows={4}
                      className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Pseudonymes (un par ligne)</label>
                    <textarea
                      value={arrayToTextarea(editForm.pseudonymNames ?? null)}
                      onChange={(e) => setEditForm({ ...editForm, pseudonymNames: textareaToArray(e.target.value) })}
                      rows={4}
                      className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(theme.id)}
                      className="rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-medium text-muted hover:bg-fill-subtle"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-content">{theme.label}</span>
                      {!theme.active && (
                        <span className="rounded-full bg-fill-subtle px-2 py-0.5 text-xs font-medium text-muted">Inactif</span>
                      )}
                      {theme.active && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Actif</span>
                      )}
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{theme.inputType}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{theme.description}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                      <span>Max {theme.maxLength} chars</span>
                      {theme.allowFreeText && <span className="rounded bg-fill-subtle px-1">Texte libre</span>}
                      {theme.options && theme.options.length > 0 && <span>{theme.options.length} options</span>}
                      {theme.pseudonymNames && theme.pseudonymNames.length > 0 && <span>{theme.pseudonymNames.length} pseudos</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(theme)}
                    className="shrink-0 rounded-lg border border-hairline-strong px-3 py-1 text-sm font-medium text-muted hover:bg-fill-subtle"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Schedule editor */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-content">Calendrier</h2>
        <div className="space-y-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm font-medium text-muted">{DAYS_FR[i]}</span>
              <select
                value={scheduleDraft[i] ?? ''}
                onChange={(e) => setScheduleDraft({ ...scheduleDraft, [i]: e.target.value })}
                className="flex-1 rounded-lg border border-hairline-strong px-3 py-2 text-sm"
              >
                <option value="">— Aucun thème —</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={savingSchedule}
          className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-dark disabled:opacity-50"
        >
          {savingSchedule ? 'Sauvegarde...' : 'Sauvegarder le calendrier'}
        </button>
      </div>
    </div>
  );
}