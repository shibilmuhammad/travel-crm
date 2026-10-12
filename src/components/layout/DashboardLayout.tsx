'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, MobileSidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function DashboardLayout({ children, title, description, actions }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const { currentUser, isAdmin, logout } = useAuth();

  const handleHeaderSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && headerSearch.trim()) {
      router.push(`/leads?search=${encodeURIComponent(headerSearch.trim())}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Deep Navy Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Crisp White Header Bar matching Reference Image 1 */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-4">
            <MobileSidebar />
            <div>
              {title && <h1 className="text-base font-bold text-slate-900">{title}</h1>}
              {description && <p className="text-xs text-slate-500">{description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            {/* Search Input matching Reference Image 1 Header */}
            <div className="relative hidden sm:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search leads by name or phone..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={handleHeaderSearch}
                className="pl-9 h-8 text-xs bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 rounded-full"
              />
            </div>

            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell className="w-4 h-4" />
            </button>

            {/* Profile Avatar & Badge matching Reference Image 1 */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-300">
                {(currentUser.full_name || currentUser.name || 'S').charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.full_name || currentUser.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 capitalize">
                  {currentUser.role}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors ml-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
