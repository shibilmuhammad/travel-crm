import fs from 'fs';
import path from 'path';
import { Lead } from '@/types';
import { MOCK_LEADS } from '@/lib/mockData';
import { normalizePhoneNumber } from '@/lib/utils';

const DATA_PATH = path.join(process.cwd(), 'src/data/leads.json');

let IN_MEMORY_LEADS: Lead[] | null = null;
let LAST_MTIME = 0;

function normalizeLead(lead: Lead): Lead {
  let member = lead.assigned_team_member;
  if (!member || member === 'Unassigned' || member.toLowerCase() === 'shibil') {
    member = 'Shibil Muhammad';
  }
  return {
    ...lead,
    assigned_team_member: member,
  };
}

export function getStoredLeads(): Lead[] {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const stat = fs.statSync(DATA_PATH);
      if (IN_MEMORY_LEADS !== null && stat.mtimeMs === LAST_MTIME) {
        return IN_MEMORY_LEADS;
      }
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed) ? parsed : [];
      IN_MEMORY_LEADS = list.map(normalizeLead);
      LAST_MTIME = stat.mtimeMs;
    } else {
      IN_MEMORY_LEADS = [];
      safeWriteLeads(IN_MEMORY_LEADS);
    }
  } catch (e) {
    console.warn('Could not read leads.json:', e);
    if (!IN_MEMORY_LEADS) {
      IN_MEMORY_LEADS = [];
    }
  }

  return IN_MEMORY_LEADS;
}

function safeWriteLeads(leads: Lead[]) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const normalized = leads.map(normalizeLead);
    fs.writeFileSync(DATA_PATH, JSON.stringify(normalized, null, 2), 'utf-8');
    const stat = fs.statSync(DATA_PATH);
    LAST_MTIME = stat.mtimeMs;
    IN_MEMORY_LEADS = normalized;
  } catch (e: any) {
    if (e?.code !== 'EROFS') {
      console.warn('File write skipped (serverless environment):', e?.message || e);
    }
  }
}

export function saveStoredLead(lead: Lead): Lead {
  const current = [...getStoredLeads()];
  const normLead = normalizeLead(lead);
  const normPhone = normalizePhoneNumber(normLead.whatsapp_number);

  let existingIndex = current.findIndex((l) => l.id === normLead.id);
  if (existingIndex === -1 && normPhone) {
    existingIndex = current.findIndex((l) => normalizePhoneNumber(l.whatsapp_number) === normPhone);
  }

  if (existingIndex >= 0) {
    current[existingIndex] = {
      ...current[existingIndex],
      ...normLead,
      id: current[existingIndex].id, // preserve canonical ID
    };
    safeWriteLeads(current);
    return current[existingIndex];
  } else {
    current.unshift(normLead);
    safeWriteLeads(current);
    return normLead;
  }
}

export function saveAllStoredLeads(leads: Lead[]): void {
  safeWriteLeads(leads);
}

export function updateStoredLead(id: string, updates: Partial<Lead>): Lead | null {
  const current = [...getStoredLeads()];
  let index = current.findIndex((l) => l.id === id);

  if (index === -1) {
    const normSearchPhone = normalizePhoneNumber(id);
    if (normSearchPhone) {
      index = current.findIndex((l) => normalizePhoneNumber(l.whatsapp_number) === normSearchPhone);
    }
  }

  if (index === -1) return null;

  current[index] = normalizeLead({ ...current[index], ...updates });
  safeWriteLeads(current);
  return current[index];
}

export function deleteStoredLead(id: string): boolean {
  let current = getStoredLeads().filter((l) => l.id !== id);
  safeWriteLeads(current);
  return true;
}

export function clearStoredLeads(): void {
  safeWriteLeads([]);
}
