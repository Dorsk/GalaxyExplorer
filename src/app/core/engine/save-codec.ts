import type { SaveData } from '../models/game.models';

/**
 * Chiffrement et signature des sauvegardes.
 *
 * Format : `GE1:<nonce>:<données chiffrées>:<signature>` (base64 / hexadécimal).
 * - Les données sont chiffrées par un flux pseudo-aléatoire dérivé d'une clé secrète et d'un nonce aléatoire :
 *   deux sauvegardes identiques ne produisent jamais le même texte.
 * - La signature couvre le nonce et le contenu : toute modification rend la sauvegarde invalide.
 *
 * La clé est livrée avec le jeu : cela empêche l'édition à la main de la sauvegarde, pas un tricheur
 * capable de lire et rejouer le code du jeu (impossible à garantir sans serveur).
 * Le traitement est synchrone pour pouvoir sauvegarder à la fermeture de l'onglet.
 */

const FORMAT = 'GE1';
const SECRET = 'GalaxyExplorer::7f3a9c1e-arche-distorsion::b52d';
const NONCE_BYTES = 12;

function cyrb53(text: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Générateur pseudo-aléatoire 32 bits (mulberry32) utilisé comme flux de chiffrement. */
function keystream(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) & 0xff;
  };
}

/** XOR avec le flux : la même opération chiffre et déchiffre. */
function xorStream(bytes: Uint8Array, nonce: string): Uint8Array {
  const next = keystream(cyrb53(`${SECRET}|${nonce}`, 0x5eed));
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ next();
  return out;
}

function sign(nonce: string, payload: string): string {
  const material = `${SECRET}|${nonce}|${payload}`;
  return cyrb53(material, 1).toString(16).padStart(14, '0') + cyrb53(material, 2).toString(16).padStart(14, '0');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function encodeSave(data: SaveData): string {
  const nonce = toBase64(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));
  const cipher = toBase64(xorStream(new TextEncoder().encode(JSON.stringify(data)), nonce));
  return [FORMAT, nonce, cipher, sign(nonce, cipher)].join(':');
}

/** Déchiffre une sauvegarde ; renvoie null si elle n'est pas au bon format ou a été modifiée. */
export function decodeSave(text: string): Partial<SaveData> | null {
  const parts = text.trim().split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT) return null;
  const [, nonce, cipher, signature] = parts;
  if (sign(nonce, cipher) !== signature) return null;
  try {
    const json = new TextDecoder().decode(xorStream(fromBase64(cipher), nonce));
    const data: unknown = JSON.parse(json);
    return typeof data === 'object' && data !== null ? (data as Partial<SaveData>) : null;
  } catch {
    return null;
  }
}
