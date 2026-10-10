import fs from 'fs';
import path from 'path';
import { TripBatch } from '@/types';
import { MOCK_BATCHES } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/batches.json');

export function getStoredBatches(): TripBatch[] {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const dir = path.dirname(DATA_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_PATH, JSON.stringify(MOCK_BATCHES, null, 2), 'utf-8');
      return MOCK_BATCHES;
    }
    const content = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error reading batches.json:', e);
    return MOCK_BATCHES;
  }
}

export function saveStoredBatch(batch: TripBatch): TripBatch {
  const current = getStoredBatches();
  const existingIndex = current.findIndex((b) => b.id === batch.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...batch };
  } else {
    current.unshift(batch);
  }

  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving batches.json:', e);
  }
  return batch;
}

export function saveAllStoredBatches(batches: TripBatch[]): void {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(batches, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving all batches.json:', e);
  }
}

export function updateStoredBatch(id: string, updates: Partial<TripBatch>): TripBatch | null {
  const current = getStoredBatches();
  const index = current.findIndex((b) => b.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error updating batches.json:', e);
  }
  return current[index];
}

export function deleteStoredBatch(id: string): boolean {
  let current = getStoredBatches();
  current = current.filter((b) => b.id !== id);
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error deleting from batches.json:', e);
    return false;
  }
}
