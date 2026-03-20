import chalk, { backgroundColorNames } from "chalk";

function stringHash(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = Math.imul(hash, 31) + character.charCodeAt(0);
  }

  return hash >>> 0;
}

export function authorToColorAvatar(username: string): string {
  const index = stringHash(username) % backgroundColorNames.length;

  return chalk[backgroundColorNames[index]]("  ");
}
