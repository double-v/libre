/**
 * #198 — les quatre branches du montage de `useEncryptedChat`.
 *
 * Le bug d'origine tient en une ligne : quand le `localStorage` était vide, le
 * hook générait une nouvelle paire et poussait la nouvelle clé publique. Sur un
 * compte qui en avait déjà une, cela rendait tout l'historique définitivement
 * illisible — en silence.
 *
 * Le test le plus important de ce fichier est donc un test de ce qui NE doit PAS
 * arriver : aucune génération quand le serveur connaît déjà une clé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const generateKeyPair = vi.fn();
const decryptPrivateKey = vi.fn();
const encryptPrivateKey = vi.fn();
vi.mock('@/lib/crypto', () => ({
  __esModule: true,
  generateKeyPair,
  decryptPrivateKey,
  encryptPrivateKey,
}));

const { useEncryptedChat } = await import('@/hooks/useEncryptedChat');

const PUBLIQUE = 'PUBLIQUE_DU_SERVEUR';
const PRIVEE = 'PRIVEE_EN_CLAIR';

let fetchMock: ReturnType<typeof vi.fn>;

/** Réponse de `GET /api/users/keys/me`. */
function coffre(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  generateKeyPair.mockResolvedValue({ publicKey: 'NEUVE_PUB', privateKey: 'NEUVE_PRIV' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('coffre garni', () => {
  it('utilise la clé restituée par le serveur', async () => {
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: PRIVEE }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.privateKey).toBe(PRIVEE);
    expect(result.current.publicKey).toBe(PUBLIQUE);
    expect(result.current.etat).toBe('pret');
    expect(generateKeyPair).not.toHaveBeenCalled();
  });

  it('ne laisse pas la clé privée sur le disque', async () => {
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: PRIVEE }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(localStorage.getItem('libre_private_key')).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain(PRIVEE);
  });
});

describe('coffre garni — nettoyage de l’héritage', () => {
  it('retire les clés de l’ancien stockage local, devenues redondantes', async () => {
    localStorage.setItem('libre_public_key', PUBLIQUE);
    localStorage.setItem('libre_private_key', 'CHIFFRE_LOCAL');
    localStorage.setItem('libre_device_key', 'CLE_APPAREIL');
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: PRIVEE }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(localStorage.getItem('libre_private_key')).toBeNull();
    expect(localStorage.getItem('libre_device_key')).toBeNull();
  });

  it('les garde tant que le coffre est vide — les effacer là détruirait la seule copie', async () => {
    localStorage.setItem('libre_public_key', PUBLIQUE);
    localStorage.setItem('libre_private_key', 'CHIFFRE_LOCAL');
    localStorage.setItem('libre_device_key', 'CLE_APPAREIL');
    decryptPrivateKey.mockResolvedValue(PRIVEE);
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: null }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(localStorage.getItem('libre_private_key')).toBe('CHIFFRE_LOCAL');
  });
});

describe('compte neuf (404)', () => {
  it('génère une paire et la dépose au coffre, clé privée comprise', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/me') ? coffre({ error: 'no_key' }, 404) : coffre({ success: true }),
    );

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const depot = fetchMock.mock.calls.find(([url]) => !String(url).includes('/me'));
    expect(depot).toBeDefined();
    expect(JSON.parse(depot![1].body)).toEqual({
      publicKey: 'NEUVE_PUB',
      privateKey: 'NEUVE_PRIV',
    });
    expect(result.current.etat).toBe('pret');
  });
});

describe('coffre vide mais clé publique connue', () => {
  it('réutilise la clé locale correspondante sans rien régénérer', async () => {
    localStorage.setItem('libre_public_key', PUBLIQUE);
    localStorage.setItem('libre_private_key', 'CHIFFRE_LOCAL');
    localStorage.setItem('libre_device_key', 'CLE_APPAREIL');
    decryptPrivateKey.mockResolvedValue(PRIVEE);
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: null }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.privateKey).toBe(PRIVEE);
    expect(result.current.etat).toBe('pret');
    expect(generateKeyPair).not.toHaveBeenCalled();
  });

  it('SE DÉCLARE ILLISIBLE sans régénérer quand aucune clé locale ne correspond', async () => {
    // La ligne qui détruisait les historiques. Un fil illisible se répare en
    // revenant sur l'appareil d'origine ; une clé régénérée ne se répare pas.
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: null }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(generateKeyPair).not.toHaveBeenCalled();
    expect(result.current.privateKey).toBeNull();
    expect(result.current.etat).toBe('illisible');
    expect(fetchMock.mock.calls.filter(([url]) => !String(url).includes('/me'))).toHaveLength(0);
  });

  it('ne régénère pas non plus quand la clé locale appartient à une autre paire', async () => {
    localStorage.setItem('libre_public_key', 'UNE_AUTRE_PUBLIQUE');
    localStorage.setItem('libre_private_key', 'CHIFFRE_LOCAL');
    localStorage.setItem('libre_device_key', 'CLE_APPAREIL');
    fetchMock.mockResolvedValue(coffre({ publicKey: PUBLIQUE, privateKey: null }));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(generateKeyPair).not.toHaveBeenCalled();
    expect(result.current.etat).toBe('illisible');
  });
});

describe('coffre injoignable', () => {
  it('ne régénère rien quand le serveur signale une panne de configuration', async () => {
    fetchMock.mockResolvedValue(coffre({ error: 'escrow_indisponible' }, 503));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(generateKeyPair).not.toHaveBeenCalled();
    expect(result.current.etat).toBe('indisponible');
  });

  it('ne régénère rien quand le réseau échoue', async () => {
    fetchMock.mockRejectedValue(new Error('réseau'));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(generateKeyPair).not.toHaveBeenCalled();
    expect(result.current.etat).toBe('indisponible');
  });

  it('ne régénère rien quand l’enveloppe est illisible côté serveur', async () => {
    fetchMock.mockResolvedValue(coffre({ error: 'escrow_illisible' }, 500));

    const { result } = renderHook(() => useEncryptedChat());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(generateKeyPair).not.toHaveBeenCalled();
    expect(result.current.etat).toBe('illisible');
  });
});
