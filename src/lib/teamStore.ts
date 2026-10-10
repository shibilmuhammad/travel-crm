import fs from 'fs';
import path from 'path';
import { TeamMember } from '@/types';
import { MOCK_TEAM_MEMBERS } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/team.json');

export function getStoredTeamMembers(): TeamMember[] {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const dir = path.dirname(DATA_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_PATH, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error reading team.json:', e);
    return [];
  }
}

export function saveStoredTeamMember(member: TeamMember): TeamMember {
  const current = getStoredTeamMembers();
  const existingIndex = current.findIndex(
    (m) => m.id === member.id || (m.email && m.email.toLowerCase() === member.email.toLowerCase())
  );

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...member };
  } else {
    current.unshift(member);
  }

  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving team.json:', e);
  }
  return member;
}

export function updateStoredTeamMember(id: string, updates: Partial<TeamMember>): TeamMember | null {
  const current = getStoredTeamMembers();
  const index = current.findIndex((m) => m.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error updating team.json:', e);
  }
  return current[index];
}

export function deleteStoredTeamMember(id: string): boolean {
  let current = getStoredTeamMembers();
  current = current.filter((m) => m.id !== id);
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error deleting team.json:', e);
    return false;
  }
}
