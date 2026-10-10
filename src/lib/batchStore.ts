import fs from 'fs';
import path from 'path';
import { TripBatch } from '@/types';
import { MOCK_BATCHES } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/batches.json');

let IN_MEMORY_BATCHES: TripBatch[] | null = null;

export function getStoredBatches(): TripBatch[] {
  if (IN_MEMORY_BATCHES !== null) {
    return IN_MEMORY_BATCHES;
  }

  try {
    if (fs.existsSync(DATA_PATH)) {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      IN_MEMORY_BATCHES = Array.isArray(parsed) ? parsed : [...MOCK_BATCHES];
    } else {
      IN_MEMORY_BATCHES = [...MOCK_BATCHES];
    }
  } catch (e) {
    console.warn('Could not read batches.json, using mock data:', e);
    IN_MEMORY_BATCHES = [...MOCK_BATCHES];
  }

  return IN_MEMORY_BATCHES;
}

function safeWriteBatches(batches: TripBatch[]) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(batches, null, 2), 'utf-8');
  } catch (e: any) {
    // EROFS on serverless environments like Vercel is expected and safe to ignore
    if (e?.code !== 'EROFS') {
      console.warn('File write skipped (serverless environment):', e?.message || e);
    }
  }
}

export function saveStoredBatch(batch: TripBatch): TripBatch {
  const current = [...getStoredBatches()];
  const existingIndex = current.findIndex((b) => b.id === batch.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...batch };
  } else {
    current.unshift(batch);
  }

  IN_MEMORY_BATCHES = current;
  safeWriteBatches(current);
  return batch;
}

export function saveAllStoredBatches(batches: TripBatch[]): void {
  IN_MEMORY_BATCHES = batches;
  safeWriteBatches(batches);
}

export function updateStoredBatch(id: string, updates: Partial<TripBatch>): TripBatch | null {
  const current = [...getStoredBatches()];
  const index = current.findIndex((b) => b.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  IN_MEMORY_BATCHES = current;
  safeWriteBatches(current);
  return current[index];
}

export function deleteStoredBatch(id: string): boolean {
  let current = getStoredBatches().filter((b) => b.id !== id);
  IN_MEMORY_BATCHES = current;
  safeWriteBatches(current);
  return true;
}
