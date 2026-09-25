import { describe, it, expect } from 'vitest';
import { detecterContact, contactFort } from '../contact';

/** Cas de la tâche T011 (spec 006, research R3), dont une sortie OCR réelle. */
const FORTS = [
  '@lola_privee75',
  'écris-moi sur t.me/xyz',
  't . m e / x y z',
  'snap: lolaa.vip',
  'telegram lola75',
  'wa.me/33612345678',
  '06 12 34 56 78',
  '061234 56 78',
  '+33 6 12 34 56 78',
  'onlyfans.com/x',
  'Telegram : @lola_privee75',
  'instagram.com/lola',
  '+44 7911 123456',
];
const FAIBLES = ["je n'ai pas Telegram", 'a@b.fr', 'telegram mais pas trop'];
const RIEN = ['@ bientôt', 'Paris 2024', "j'aime le 06", 'un signal fort', "J'adore la randonnée et le cinéma."];

describe('detecterContact (#443)', () => {
  it.each(FORTS)('fort : %s', (texte) => {
    const r = detecterContact(texte);
    expect(r.some((c) => c.force === 'fort'), JSON.stringify(r)).toBe(true);
    expect(contactFort(texte)).not.toBeNull();
  });

  it.each(FAIBLES)('faible seulement : %s', (texte) => {
    const r = detecterContact(texte);
    expect(r.length, JSON.stringify(r)).toBeGreaterThan(0);
    expect(r.every((c) => c.force === 'faible'), JSON.stringify(r)).toBe(true);
    expect(contactFort(texte)).toBeNull();
  });

  it.each(RIEN)('rien : %s', (texte) => {
    expect(detecterContact(texte)).toEqual([]);
  });

  it('rend le passage repéré, pas le texte entier', () => {
    const r = detecterContact('Bonjour, je suis Lola. Écris-moi sur t.me/lola75 pour la suite de notre histoire.');
    expect(r[0].extrait).toBe('t.me/lola75');
  });

  it('ne signale pas deux fois le même contact', () => {
    const r = detecterContact('Telegram : @lola_privee75');
    expect(r.filter((c) => c.force === 'fort')).toHaveLength(1);
  });
});
