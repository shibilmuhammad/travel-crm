'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, TrendingUp, Bell,
  MessageSquare, Settings, ChevronLeft, ChevronRight,
  Plane, MapPin, Menu, X, UserCheck, Shield, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { currentUser, isAdmin, teamMembers, setCurrentUser, logout } = useAuth();

  const navItems = isAdmin
    ? [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/leads', label: 'Leads', icon: Users },
        { href: '/demand', label: 'Trip Demand', icon: TrendingUp },
        { href: '/trips', label: 'Trips & Batches', icon: Plane },
        { href: '/followups', label: 'Follow-ups', icon: Bell },
        { href: '/activity', label: 'Call Notes', icon: MessageSquare },
        { href: '/team', label: 'Team', icon: UserCheck },
        { href: '/settings', label: 'Settings', icon: Settings },
      ]
    : [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/leads', label: 'My Leads', icon: Users },
        { href: '/followups', label: 'Follow-ups', icon: Bell },
        { href: '/activity', label: 'Notifications', icon: MessageSquare },
      ];

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-[#0b2147] border-r border-[#091b3a] transition-all duration-300 ease-in-out text-slate-100 shadow-xl',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header matching UNZOLO Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-[#091a38]',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-black/20 overflow-hidden">
          <img src="/unzolo-logo.jpg" alt="UNZOLO" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-extrabold text-white tracking-wider leading-none">UNZOLO</div>
            <div className="text-[10px] font-bold text-sky-300 tracking-wider mt-1 uppercase">
              {isAdmin ? 'ADMIN PANEL' : 'TELECALLER PANEL'}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (item.href === '/leads') {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('unzolo:reset-leads'));
                  }
                }
              }}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('flex-shrink-0 w-4 h-4', isActive ? 'text-white' : 'text-slate-300')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Account Switcher Widget */}
      {!collapsed && (
        <div className="p-3 border-t border-white/10 bg-[#091a38]">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1">Switch User Account</div>
          <Select
            value={currentUser.id}
            onValueChange={(id) => {
              const selected = teamMembers.find((m) => m.id === id);
              if (selected) setCurrentUser(selected);
            }}
          >
            <SelectTrigger className="w-full bg-[#122e5e] border-blue-400/30 text-xs text-white h-9 focus:ring-sky-400">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {(currentUser.full_name || currentUser.name || 'U').charAt(0)}
                </div>
                <span className="truncate font-medium">{currentUser.full_name || currentUser.name}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-900/80 text-sky-200">
                  {currentUser.role}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#0e254e] border-blue-400/30 text-white">
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.full_name || m.name}</span>
                    <span className="text-[10px] text-sky-300 uppercase">({m.role})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={logout}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      )}

      {/* Sidebar Collapse Toggle */}
      <div className="p-2 border-t border-white/10 flex justify-end">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser, isAdmin } = useAuth();

  const navItems = isAdmin
    ? [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/leads', label: 'Leads', icon: Users },
        { href: '/demand', label: 'Trip Demand', icon: TrendingUp },
        { href: '/trips', label: 'Trips & Batches', icon: Plane },
        { href: '/followups', label: 'Follow-ups', icon: Bell },
        { href: '/activity', label: 'Call Notes', icon: MessageSquare },
        { href: '/team', label: 'Team', icon: UserCheck },
        { href: '/settings', label: 'Settings', icon: Settings },
      ]
    : [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/leads', label: 'My Leads', icon: Users },
        { href: '/followups', label: 'Follow-ups', icon: Bell },
        { href: '/activity', label: 'Notifications', icon: MessageSquare },
      ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#0b2147] border-r border-[#091b3a] flex flex-col text-slate-100">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  <img src="/unzolo-logo.jpg" alt="UNZOLO" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-white tracking-wider">UNZOLO</div>
                  <div className="text-[10px] uppercase text-sky-300 font-bold">{isAdmin ? 'ADMIN PANEL' : 'TELECALLER PANEL'}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded text-slate-300 hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                      isActive ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-white/10'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
