import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED_DIR = fileURLToPath(new URL('../../data/seed/', import.meta.url));
const FILES = ['city', 'categories', 'directions', 'institutions', 'courses', 'quiz'];

// Синхронно читає всі seed-файли. Кожен виклик повертає нові об'єкти.
export function loadSeedData(dir = SEED_DIR) {
  return Object.fromEntries(
    FILES.map((name) => [name, JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'))]),
  );
}
