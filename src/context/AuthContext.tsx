'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TeamMember, UserRole } from '@/types';
import { MOCK_TEAM_MEMBERS } from '@/lib/mockData';

interface AuthContextType {
  currentUser: TeamMember;
  setCurrentUser: (user: TeamMember) => void;
  role: UserRole;
  isAdmin: boolean;
  isTelecaller: boolean;
  teamMembers: TeamMember[];
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { full_name: string; email: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  loginGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshTeamMembers: () => Promise<void>;
}

const DEFAULT_ADMIN: TeamMember = MOCK_TEAM_MEMBERS[0] || {
  id: 'user-1',
  full_name: 'Shibil',
  name: 'Shibil',
  email: 'shibilmuhammad678@gmail.com',
  phone: '+918086812602',
  role: 'admin',
  daily_call_target: 0,
  daily_conversion_target: 0,
  status: 'active',
  last_login: '09 Oct 2026, 03:35 PM',
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  currentUser: DEFAULT_ADMIN,
  setCurrentUser: () => {},
  role: 'admin',
  isAdmin: true,
  isTelecaller: false,
  teamMembers: [DEFAULT_ADMIN],
  isAuthenticated: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  loginGoogle: async () => ({ success: false }),
  logout: () => {},
  refreshTeamMembers: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(MOCK_TEAM_MEMBERS);
  const [currentUser, setCurrentUser] = useState<TeamMember>(DEFAULT_ADMIN);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);

  // Load custom team members from localStorage if available
  const loadStoredMembers = () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('unzolo_custom_members');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  const saveStoredMembers = (members: TeamMember[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('unzolo_custom_members', JSON.stringify(members));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      let apiMembers: TeamMember[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          apiMembers = data;
        }
      }
      
      const stored = loadStoredMembers();
      // Combine API/Mock + custom stored members uniquely by email/id
      const combinedMap = new Map<string, TeamMember>();
      MOCK_TEAM_MEMBERS.forEach(m => combinedMap.set((m.email || m.id).toLowerCase(), m));
      apiMembers.forEach(m => combinedMap.set((m.email || m.id).toLowerCase(), m));
      stored.forEach((m: TeamMember) => combinedMap.set((m.email || m.id).toLowerCase(), m));
      
      const allMembers = Array.from(combinedMap.values());
      setTeamMembers(allMembers);

      const savedId = localStorage.getItem('active_user_id');
      if (savedId) {
        const found = allMembers.find((m) => m.id === savedId || m.email === savedId);
        if (found) setCurrentUser(found);
      }
    } catch (e) {
      console.error('Failed to load team members:', e);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    const authFlag = localStorage.getItem('is_authenticated');
    const savedUserId = localStorage.getItem('active_user_id');

    if (authFlag === 'true' && savedUserId && teamMembers.length > 0) {
      const found = teamMembers.find((m) => m.id === savedUserId || m.email === savedUserId);
      if (found) {
        setCurrentUser(found);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } else if (authFlag === 'true' && teamMembers.length > 0) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setInitialized(true);
  }, [teamMembers]);

  // Route protection
  useEffect(() => {
    if (initialized && !isAuthenticated && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
    }
  }, [initialized, isAuthenticated, pathname, router]);

  const handleSetUser = (user: TeamMember) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('active_user_id', user.id);
    localStorage.setItem('is_authenticated', 'true');
  };

  const login = async (email: string, password?: string) => {
    const normEmail = email.trim().toLowerCase();
    
    // Check all current team members
    const found = teamMembers.find((m) => (m.email || '').trim().toLowerCase() === normEmail);

    if (found) {
      // If user has a password set and password input is provided, check matching
      if (found.password && password && found.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      handleSetUser(found);
      return { success: true };
    }

    return { success: false, error: 'Account not found with this email. Please check your credentials or Sign Up.' };
  };

  const signup = async (data: { full_name: string; email: string; password?: string }) => {
    const normEmail = data.email.trim().toLowerCase();

    if (normEmail !== 'shibilmuhammad678@gmail.com') {
      return {
        success: false,
        error: 'Admin signup is restricted to authorized email address (shibilmuhammad678@gmail.com).',
      };
    }

    const existing = teamMembers.find((m) => (m.email || '').trim().toLowerCase() === normEmail);

    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please Sign In instead.' };
    }

    const newAdmin: TeamMember = {
      id: `user-${Date.now()}`,
      full_name: data.full_name,
      name: data.full_name,
      email: normEmail,
      phone: null,
      password: data.password || 'password123',
      role: 'admin',
      daily_call_target: 0,
      daily_conversion_target: 0,
      status: 'active',
      last_login: 'Just now',
      created_at: new Date().toISOString(),
    };

    // Store custom admin member locally
    const stored = loadStoredMembers();
    saveStoredMembers([...stored, newAdmin]);

    const updatedList = [newAdmin, ...teamMembers];
    setTeamMembers(updatedList);
    handleSetUser(newAdmin);

    // Try posting to API as well
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
    } catch (e) {
      console.error(e);
    }

    return { success: true };
  };

  const loginGoogle = async () => {
    // Simulated Google OAuth response
    const googleUser = {
      full_name: 'Google User',
      email: 'user.google@gmail.com',
    };

    const normEmail = googleUser.email;
    let found = teamMembers.find((m) => (m.email || '').trim().toLowerCase() === normEmail);

    if (!found) {
      const newAdmin: TeamMember = {
        id: `user-google-${Date.now()}`,
        full_name: googleUser.full_name,
        name: googleUser.full_name,
        email: normEmail,
        phone: null,
        role: 'admin',
        daily_call_target: 0,
        daily_conversion_target: 0,
        status: 'active',
        last_login: 'Just now',
        created_at: new Date().toISOString(),
      };
      const stored = loadStoredMembers();
      saveStoredMembers([...stored, newAdmin]);
      setTeamMembers([newAdmin, ...teamMembers]);
      found = newAdmin;
    }

    handleSetUser(found);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('is_authenticated', 'false');
    router.push('/login');
  };

  const role = currentUser.role || 'admin';
  const isAdmin = role === 'admin';
  const isTelecaller = role === 'telecaller';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetUser,
        role,
        isAdmin,
        isTelecaller,
        teamMembers,
        isAuthenticated,
        login,
        signup,
        loginGoogle,
        logout,
        refreshTeamMembers: fetchTeam,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

