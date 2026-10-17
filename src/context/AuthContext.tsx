'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TeamMember, UserRole } from '@/types';
import { MOCK_TEAM_MEMBERS } from '@/lib/mockData';

interface AuthContextType {
  currentUser: TeamMember;
  setCurrentUser: (user: TeamMember) => void;
  authenticatedUser: TeamMember | null;
  role: UserRole;
  isAdmin: boolean;
  isRealAdmin: boolean;
  isImpersonating: boolean;
  isTelecaller: boolean;
  teamMembers: TeamMember[];
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { full_name: string; email: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  loginGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetToAdmin: () => void;
  refreshTeamMembers: () => Promise<void>;
}

const DEFAULT_ADMIN: TeamMember = MOCK_TEAM_MEMBERS[0] || {
  id: 'user-1',
  full_name: 'Shibil Muhammad',
  name: 'Shibil Muhammad',
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
  authenticatedUser: DEFAULT_ADMIN,
  role: 'admin',
  isAdmin: true,
  isRealAdmin: true,
  isImpersonating: false,
  isTelecaller: false,
  teamMembers: [DEFAULT_ADMIN],
  isAuthenticated: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  loginGoogle: async () => ({ success: false }),
  logout: () => {},
  resetToAdmin: () => {},
  refreshTeamMembers: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(MOCK_TEAM_MEMBERS);
  const [currentUser, setCurrentUser] = useState<TeamMember>(DEFAULT_ADMIN);
  const [authenticatedUser, setAuthenticatedUser] = useState<TeamMember | null>(DEFAULT_ADMIN);
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

  useEffect(() => {
    // Restore session instantly from localStorage on page refresh
    const authFlag = localStorage.getItem('is_authenticated');
    const savedUserData = localStorage.getItem('active_user_data');
    const savedAuthData = localStorage.getItem('authenticated_user_data');

    if (authFlag === 'true') {
      setIsAuthenticated(true);
      let parsedAuthUser: TeamMember | null = null;
      let parsedActiveUser: TeamMember | null = null;

      if (savedAuthData) {
        try {
          parsedAuthUser = JSON.parse(savedAuthData);
        } catch (e) {
          console.error(e);
        }
      }

      if (savedUserData) {
        try {
          parsedActiveUser = JSON.parse(savedUserData);
        } catch (e) {
          console.error(e);
        }
      }

      // If no authenticated_user_data was stored yet, infer it
      if (!parsedAuthUser && parsedActiveUser) {
        parsedAuthUser = parsedActiveUser;
        localStorage.setItem('authenticated_user_data', JSON.stringify(parsedActiveUser));
      }

      const realAdmin =
        parsedAuthUser?.role === 'admin' ||
        parsedAuthUser?.email?.toLowerCase() === 'shibilmuhammad678@gmail.com';

      if (parsedAuthUser) {
        setAuthenticatedUser(parsedAuthUser);
      }

      // SECURITY ENFORCEMENT:
      // If the authenticated user is NOT an admin, they CANNOT impersonate or be on any other account!
      // Force currentUser to match authenticatedUser!
      if (!realAdmin && parsedAuthUser) {
        setCurrentUser(parsedAuthUser);
        localStorage.setItem('active_user_data', JSON.stringify(parsedAuthUser));
        localStorage.setItem('active_user_id', parsedAuthUser.id);
      } else if (parsedActiveUser) {
        setCurrentUser(parsedActiveUser);
      } else if (parsedAuthUser) {
        setCurrentUser(parsedAuthUser);
      }
    } else {
      setIsAuthenticated(false);
      setAuthenticatedUser(null);
    }
    setInitialized(true);
  }, []);

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

      // If Supabase returned 0 team members, automatically seed DEFAULT_ADMIN into Supabase
      if (apiMembers.length === 0) {
        try {
          const syncRes = await fetch('/api/team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DEFAULT_ADMIN),
          });
          if (syncRes.ok) {
            const syncedAdmin = await syncRes.json();
            apiMembers = [syncedAdmin];
          }
        } catch (e) {
          console.error('Error auto-syncing admin account to Supabase:', e);
        }
      }
      
      const stored = loadStoredMembers();
      const combinedMap = new Map<string, TeamMember>();
      MOCK_TEAM_MEMBERS.forEach(m => combinedMap.set((m.email || m.id).toLowerCase(), m));
      apiMembers.forEach(m => combinedMap.set((m.email || m.id).toLowerCase(), m));
      stored.forEach((m: TeamMember) => combinedMap.set((m.email || m.id).toLowerCase(), m));
      
      const allMembers = Array.from(combinedMap.values());
      setTeamMembers(allMembers);

      const savedId = localStorage.getItem('active_user_id');
      if (savedId && allMembers.length > 0) {
        const found = allMembers.find((m) => m.id === savedId || m.email === savedId);
        if (found) {
          // If staff, verify found matches authenticatedUser
          const savedAuth = localStorage.getItem('authenticated_user_data');
          let parsedAuth: TeamMember | null = null;
          if (savedAuth) {
            try {
              parsedAuth = JSON.parse(savedAuth);
            } catch {}
          }
          const realAdmin = parsedAuth?.role === 'admin' || parsedAuth?.email?.toLowerCase() === 'shibilmuhammad678@gmail.com';
          if (realAdmin || (parsedAuth && found.id === parsedAuth.id)) {
            setCurrentUser(found);
            localStorage.setItem('active_user_data', JSON.stringify(found));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load team members:', e);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const isRealAdmin = Boolean(
    authenticatedUser?.role === 'admin' ||
    authenticatedUser?.email?.toLowerCase() === 'shibilmuhammad678@gmail.com'
  );

  // Route protection
  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      // Admin only routes that staff must NEVER access
      const ADMIN_ONLY_ROUTES = ['/team', '/trips', '/demand', '/settings'];
      const isTryingAdminRoute = ADMIN_ONLY_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
      );

      if (!isRealAdmin && isTryingAdminRoute) {
        router.push('/');
      }
    }
  }, [initialized, isAuthenticated, isRealAdmin, pathname, router]);

  const handleSetUser = (user: TeamMember) => {
    // Only real admin can switch accounts!
    if (!isRealAdmin && authenticatedUser && user.id !== authenticatedUser.id) {
      console.warn('Unauthorized: staff cannot switch user accounts.');
      return;
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('active_user_id', user.id);
    localStorage.setItem('active_user_data', JSON.stringify(user));
    localStorage.setItem('is_authenticated', 'true');
  };

  const resetToAdmin = () => {
    if (isRealAdmin && authenticatedUser) {
      handleSetUser(authenticatedUser);
    }
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

      setAuthenticatedUser(found);
      setCurrentUser(found);
      setIsAuthenticated(true);
      localStorage.setItem('authenticated_user_data', JSON.stringify(found));
      localStorage.setItem('active_user_id', found.id);
      localStorage.setItem('active_user_data', JSON.stringify(found));
      localStorage.setItem('is_authenticated', 'true');

      // Post to API to make sure user exists in Supabase
      try {
        await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(found),
        });
      } catch (e) {
        console.error(e);
      }

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

    const adminMember: TeamMember = {
      id: 'user-1',
      full_name: data.full_name || 'Shibil',
      name: data.full_name || 'Shibil',
      email: normEmail,
      phone: '+918086812602',
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
    saveStoredMembers([adminMember, ...stored.filter((m: TeamMember) => m.email !== normEmail)]);

    const updatedList = [adminMember, ...teamMembers.filter((m: TeamMember) => m.email !== normEmail)];
    setTeamMembers(updatedList);
    setAuthenticatedUser(adminMember);
    setCurrentUser(adminMember);
    setIsAuthenticated(true);
    localStorage.setItem('authenticated_user_data', JSON.stringify(adminMember));
    localStorage.setItem('active_user_id', adminMember.id);
    localStorage.setItem('active_user_data', JSON.stringify(adminMember));
    localStorage.setItem('is_authenticated', 'true');

    // Sync to backend / Supabase
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminMember),
      });
    } catch (e) {
      console.error('Error posting admin to API:', e);
    }

    return { success: true };
  };

  const loginGoogle = async () => {
    // Simulated Google OAuth response
    const googleUser = {
      full_name: 'Shibil',
      email: 'shibilmuhammad678@gmail.com',
    };

    const normEmail = googleUser.email;
    let found = teamMembers.find((m) => (m.email || '').trim().toLowerCase() === normEmail);

    if (!found) {
      found = {
        id: 'user-1',
        full_name: googleUser.full_name,
        name: googleUser.full_name,
        email: normEmail,
        phone: '+918086812602',
        role: 'admin',
        daily_call_target: 0,
        daily_conversion_target: 0,
        status: 'active',
        last_login: 'Just now',
        created_at: new Date().toISOString(),
      };
      const stored = loadStoredMembers();
      saveStoredMembers([...stored, found]);
      setTeamMembers([found, ...teamMembers]);
    }

    setAuthenticatedUser(found);
    setCurrentUser(found);
    setIsAuthenticated(true);
    localStorage.setItem('authenticated_user_data', JSON.stringify(found));
    localStorage.setItem('active_user_id', found.id);
    localStorage.setItem('active_user_data', JSON.stringify(found));
    localStorage.setItem('is_authenticated', 'true');

    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(found),
      });
    } catch (e) {
      console.error(e);
    }

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthenticatedUser(null);
    setCurrentUser(DEFAULT_ADMIN);
    localStorage.setItem('is_authenticated', 'false');
    localStorage.removeItem('active_user_id');
    localStorage.removeItem('active_user_data');
    localStorage.removeItem('authenticated_user_data');
    router.push('/login');
  };

  const role = currentUser.role || 'telecaller';
  const isAdmin = role === 'admin';
  const isTelecaller = role === 'telecaller';
  const isImpersonating = Boolean(
    isRealAdmin &&
    authenticatedUser?.id &&
    currentUser?.id &&
    currentUser.id !== authenticatedUser.id
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetUser,
        authenticatedUser,
        role,
        isAdmin,
        isRealAdmin,
        isImpersonating,
        isTelecaller,
        teamMembers,
        isAuthenticated,
        login,
        signup,
        loginGoogle,
        logout,
        resetToAdmin,
        refreshTeamMembers: fetchTeam,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
