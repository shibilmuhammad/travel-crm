import fs from 'fs';
import path from 'path';
import { TeamMember } from '@/types';
import { MOCK_TEAM_MEMBERS } from '@/lib/mockData';

const DATA_PATH = path.join(process.cwd(), 'src/data/team.json');

let IN_MEMORY_TEAM: TeamMember[] | null = null;

export function getStoredTeamMembers(): TeamMember[] {
  if (IN_MEMORY_TEAM !== null) {
    return IN_MEMORY_TEAM;
  }

  try {
    if (fs.existsSync(DATA_PATH)) {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      IN_MEMORY_TEAM = Array.isArray(parsed) ? parsed : [...MOCK_TEAM_MEMBERS];
    } else {
      IN_MEMORY_TEAM = [...MOCK_TEAM_MEMBERS];
    }
  } catch (e) {
    console.warn('Could not read team.json, using mock data:', e);
    IN_MEMORY_TEAM = [...MOCK_TEAM_MEMBERS];
  }

  return IN_MEMORY_TEAM;
}

function safeWriteTeam(members: TeamMember[]) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(members, null, 2), 'utf-8');
  } catch (e: any) {
    if (e?.code !== 'EROFS') {
      console.warn('File write skipped (serverless environment):', e?.message || e);
    }
  }
}

export function saveStoredTeamMember(member: TeamMember): TeamMember {
  const current = [...getStoredTeamMembers()];
  const existingIndex = current.findIndex(
    (m) => m.id === member.id || (m.email && m.email.toLowerCase() === member.email.toLowerCase())
  );

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...member };
  } else {
    current.unshift(member);
  }

  IN_MEMORY_TEAM = current;
  safeWriteTeam(current);
  return member;
}

export function saveAllStoredTeamMembers(members: TeamMember[]): void {
  IN_MEMORY_TEAM = members;
  safeWriteTeam(members);
}

export function updateStoredTeamMember(id: string, updates: Partial<TeamMember>): TeamMember | null {
  const current = [...getStoredTeamMembers()];
  const index = current.findIndex((m) => m.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  IN_MEMORY_TEAM = current;
  safeWriteTeam(current);
  return current[index];
}

export function deleteStoredTeamMember(id: string): boolean {
  let current = getStoredTeamMembers().filter((m) => m.id !== id);
  IN_MEMORY_TEAM = current;
  safeWriteTeam(current);
  return true;
}
