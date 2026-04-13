import { randomInt } from "node:crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Mot de passe provisoire lisible (12 caractères). */
export function generateTempPassword(length = 12): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += ALPHABET[randomInt(ALPHABET.length)];
  }
  return s;
}
