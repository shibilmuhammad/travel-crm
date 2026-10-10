import fs from 'fs';
import path from 'path';
import { Lead } from '@/types';
import { MOCK_LEADS } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/leads.json');

let IN_MEMORY_LEADS: Lead[] | null = null;

export function getStoredLeads(): Lead[] {
  if (IN_MEMORY_LEADS !== null) {
    return IN_MEMORY_LEADS;
  }

  try {
    if (fs.existsSync(DATA_PATH)) {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      IN_MEMORY_LEADS = Array.isArray(parsed) ? parsed : [...MOCK_LEADS];
    } else {
      IN_MEMORY_LEADS = [...MOCK_LEADS];
    }
  } catch (e) {
    console.warn('Could not read leads.json, using mock data:', e);
    IN_MEMORY_LEADS = [...MOCK_LEADS];
  }

  return IN_MEMORY_LEADS;
}

function safeWriteLeads(leads: Lead[]) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (e: any) {
    if (e?.code !== 'EROFS') {
      console.warn('File write skipped (serverless environment):', e?.message || e);
    }
  }
}

export function saveStoredLead(lead: Lead): Lead {
  const current = [...getStoredLeads()];
  const existingIndex = current.findIndex((l) => l.id === lead.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...lead };
  } else {
    current.unshift(lead);
  }

  IN_MEMORY_LEADS = current;
  safeWriteLeads(current);
  return lead;
}

export function saveAllStoredLeads(leads: Lead[]): void {
  IN_MEMORY_LEADS = leads;
  safeWriteLeads(leads);
}

export function updateStoredLead(id: string, updates: Partial<Lead>): Lead | null {
  const current = [...getStoredLeads()];
  const index = current.findIndex((l) => l.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  IN_MEMORY_LEADS = current;
  safeWriteLeads(current);
  return current[index];
}

export function deleteStoredLead(id: string): boolean {
  let current = getStoredLeads().filter((l) => l.id !== id);
  IN_MEMORY_LEADS = current;
  safeWriteLeads(current);
  return true;
}
