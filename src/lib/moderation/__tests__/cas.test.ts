/**
 * Cas dérivés du hub Membres (spec 012, US3, FR-013 à FR-016).
 * Attendus écrits à la main, jamais recalculés par le module testé.
 */
import { describe, it, expect } from 'vitest';
import {
  GRAVITE, urgence, comparerUrgence, FILTRES, FILTRES_TRAVAIL, estFiltre, estTri,
  encoderCurseur, decoderCurseur, echapperRecherche,
} from '../cas';

const d = (iso: string) => new Date(iso);

describe('gravité par type (data-model.md)', () => {
  it.each([
    ['report', 'bad'], ['verif', 'warn'], ['photo', 'warn'], ['reponse', 'warn'], ['relecture', 'warn'], ['indice', 'info'],
  ] as const)('%s → %s', (type, g) => expect(GRAVITE[type]).toBe(g));
});

describe('urgence d’un membre', () => {
  it('sans cas : rang 9, aucune date', () => {
    expect(urgence([])).toEqual({ rang: 9, depuis: null });
  });
  it('le cas le plus grave décide du rang, même plus récent qu’un cas moins grave', () => {
    expect(urgence([
      { type: 'indice', id: 'a', depuis: d('2026-11-01T00:00:00Z') },
      { type: 'report', id: 'b', depuis: d('2026-11-10T00:00:00Z') },
    ])).toEqual({ rang: 0, depuis: d('2026-11-10T00:00:00Z') });
  });
  it('à gravité égale, la date est celle du plus ancien cas de ce rang, pas d’un cas moins grave', () => {
    expect(urgence([
      { type: 'photo', id: 'a', depuis: d('2026-11-09T00:00:00Z') },
      { type: 'indice', id: 'i', depuis: d('2026-10-01T00:00:00Z') },
      { type: 'verif', id: 'b', depuis: d('2026-11-08T00:00:00Z') },
    ])).toEqual({ rang: 1, depuis: d('2026-11-08T00:00:00Z') });
  });
});

describe('tri par urgence (FR-015)', () => {
  const m = (id: string, cas: Array<[string, string]>, createdAt = '2026-01-01T00:00:00Z') => ({
    id,
    createdAt: d(createdAt),
    cas: cas.map(([type, depuis], i) => ({ type: type as 'report', id: `${id}${i}`, depuis: d(depuis) })),
  });
  it('signalements, puis selfies / photos / réponses par ancienneté, puis indices, puis les autres', () => {
    const membres = [
      m('sans', []),
      m('indice', [['indice', '2026-11-01T00:00:00Z']]),
      m('photo-recente', [['photo', '2026-11-11T00:00:00Z']]),
      m('report', [['report', '2026-11-11T12:00:00Z']]),
      m('verif-ancienne', [['verif', '2026-11-05T00:00:00Z']]),
      m('reponse', [['reponse', '2026-11-07T00:00:00Z']]),
      m('report-ancien', [['report', '2026-11-02T00:00:00Z']]),
    ];
    expect([...membres].sort(comparerUrgence).map((x) => x.id)).toEqual([
      'report-ancien', 'report', 'verif-ancienne', 'reponse', 'photo-recente', 'indice', 'sans',
    ]);
  });
  it('égalité parfaite : l’identifiant départage, pour une pagination stable', () => {
    const a = m('b', [['report', '2026-11-02T00:00:00Z']]);
    const b = m('a', [['report', '2026-11-02T00:00:00Z']]);
    expect([a, b].sort(comparerUrgence).map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('membres sans cas : le plus ancien inscrit d’abord, comme « le plus ancien d’abord »', () => {
    expect([m('jeune', [], '2026-11-01T00:00:00Z'), m('vieux', [], '2026-01-01T00:00:00Z')].sort(comparerUrgence).map((x) => x.id))
      .toEqual(['vieux', 'jeune']);
  });
});

describe('filtres et tris acceptés', () => {
  it('douze filtres, dans l’ordre du prototype', () => {
    expect(FILTRES.map((f) => f.cle)).toEqual(['atraiter', 'verif', 'report', 'photo', 'reponse', 'indice', 'douteux', 'verifies', 'masques', 'bannis', 'nonconf', 'tous']);
  });
  it('seuls les filtres de travail portent un compteur (FR-014)', () => {
    expect([...FILTRES_TRAVAIL]).toEqual(['atraiter', 'verif', 'report', 'photo', 'reponse', 'indice']);
  });
  it.each(['atraiter', 'tous', 'nonconf'])('filtre %s accepté', (f) => expect(estFiltre(f)).toBe(true));
  it.each(['', 'ATRAITER', 'tous ', 'relecture;', '__proto__', 'toString'])('filtre « %s » refusé', (f) => expect(estFiltre(f)).toBe(false));
  it.each(['urgence', 'recent', 'fiabilite'])('tri %s accepté', (t) => expect(estTri(t)).toBe(true));
  it.each(['', 'fiab', 'constructor', 'recent desc'])('tri « %s » refusé', (t) => expect(estTri(t)).toBe(false));
});

describe('curseur (FR-S14)', () => {
  const id = '3f2b8c1e-1d2a-4c3b-9a8e-7f6d5c4b3a21';
  it.each([
    ['urgence', { tri: 'urgence', rang: 1, temps: '2026-11-08T10:00:00.123Z', id }],
    ['recent', { tri: 'recent', temps: '2026-11-08T10:00:00.000Z', id }],
    ['fiabilite', { tri: 'fiabilite', rang: 2, n: 4, temps: '2026-11-08T10:00:00.000Z', id }],
  ] as const)('aller-retour %s', (_t, c) => {
    expect(decoderCurseur(encoderCurseur(c), c.tri)).toEqual(c);
  });
  it('un curseur d’un autre tri est refusé', () => {
    expect(decoderCurseur(encoderCurseur({ tri: 'recent', temps: '2026-11-08T10:00:00.000Z', id }), 'urgence')).toBeNull();
  });
  it.each([
    ['vide', ''],
    ['pas du base64url', '!!!'],
    ['tronqué', encoderCurseur({ tri: 'recent', temps: '2026-11-08T10:00:00.000Z', id }).slice(0, 20)],
    ['JSON non objet', Buffer.from('[1,2]').toString('base64url')],
    ['identifiant forgé', Buffer.from(JSON.stringify({ tri: 'recent', temps: '2026-11-08T10:00:00.000Z', id: "x' OR 1=1 --" })).toString('base64url')],
    ['date invalide', Buffer.from(JSON.stringify({ tri: 'recent', temps: 'hier', id })).toString('base64url')],
    ['rang hors bornes', Buffer.from(JSON.stringify({ tri: 'urgence', rang: 10, temps: '2026-11-08T10:00:00.000Z', id })).toString('base64url')],
    ['rang non entier', Buffer.from(JSON.stringify({ tri: 'urgence', rang: 1.5, temps: '2026-11-08T10:00:00.000Z', id })).toString('base64url')],
    ['nombre négatif', Buffer.from(JSON.stringify({ tri: 'fiabilite', rang: 1, n: -1, temps: '2026-11-08T10:00:00.000Z', id })).toString('base64url')],
    ['champ en trop', Buffer.from(JSON.stringify({ tri: 'recent', temps: '2026-11-08T10:00:00.000Z', id, sql: 'x' })).toString('base64url')],
    ['trop long', 'a'.repeat(400)],
  ])('refusé : %s', (_c, brut) => {
    expect(decoderCurseur(brut, brut.length > 0 && _c === 'identifiant forgé' ? 'recent' : 'recent')).toBeNull();
    expect(decoderCurseur(brut, 'urgence')).toBeNull();
    expect(decoderCurseur(brut, 'fiabilite')).toBeNull();
  });
});

describe('recherche littérale (FR-S14)', () => {
  it.each([
    ['julien', 'julien'],
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['c:\\x', 'c:\\\\x'],
    ["l'ami", "l'ami"],
  ])('« %s » → « %s »', (q, attendu) => expect(echapperRecherche(q)).toBe(attendu));
});
