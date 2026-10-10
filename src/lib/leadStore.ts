import fs from 'fs';
import path from 'path';
import { Lead } from '@/types';
import { MOCK_LEADS } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/leads.json');

export function getStoredLeads(): Lead[] {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const dir = path.dirname(DATA_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_PATH, JSON.stringify(MOCK_LEADS, null, 2), 'utf-8');
      return MOCK_LEADS;
    }
    const content = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error reading leads.json:', e);
    return MOCK_LEADS;
  }
}

export function saveStoredLead(lead: Lead): Lead {
  const current = getStoredLeads();
  const existingIndex = current.findIndex((l) => l.id === lead.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...lead };
  } else {
    current.unshift(lead);
  }

  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving leads.json:', e);
  }
  return lead;
}

export function saveAllStoredLeads(leads: Lead[]): void {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving all leads.json:', e);
  }
}

export function updateStoredLead(id: string, updates: Partial<Lead>): Lead | null {
  const current = getStoredLeads();
  const index = current.findIndex((l) => l.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error updating leads.json:', e);
  }
  return current[index];
}

export function deleteStoredLead(id: string): boolean {
  let current = getStoredLeads();
  current = current.filter((l) => l.id !== id);
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error deleting from leads.json:', e);
    return false;
  }
}
