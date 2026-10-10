import fs from 'fs';
import path from 'path';
import { LeadActivity } from '@/types';
import { MOCK_ACTIVITIES } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/activities.json');

let IN_MEMORY_ACTIVITIES: LeadActivity[] | null = null;

export function getStoredActivities(): LeadActivity[] {
  if (IN_MEMORY_ACTIVITIES !== null) {
    return IN_MEMORY_ACTIVITIES;
  }

  try {
    if (fs.existsSync(DATA_PATH)) {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      IN_MEMORY_ACTIVITIES = Array.isArray(parsed) ? parsed : [...MOCK_ACTIVITIES];
    } else {
      IN_MEMORY_ACTIVITIES = [...MOCK_ACTIVITIES];
    }
  } catch (e) {
    console.warn('Could not read activities.json, using mock data:', e);
    IN_MEMORY_ACTIVITIES = [...MOCK_ACTIVITIES];
  }

  return IN_MEMORY_ACTIVITIES;
}

function safeWriteActivities(activities: LeadActivity[]) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(activities, null, 2), 'utf-8');
  } catch (e: any) {
    if (e?.code !== 'EROFS') {
      console.warn('File write skipped (serverless environment):', e?.message || e);
    }
  }
}

export function saveStoredActivity(activity: LeadActivity): LeadActivity {
  const current = [...getStoredActivities()];
  const existingIndex = current.findIndex((a) => a.id === activity.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...activity };
  } else {
    current.unshift(activity);
  }

  IN_MEMORY_ACTIVITIES = current;
  safeWriteActivities(current);
  return activity;
}
