'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PortalBar } from './portal-bar';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-api';
import { Anchor, Bell, Check, CheckCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { GlobalSearch } from './global-search';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  STATUS_CHANGE: 'var(--color-accent-amber)',
  INVOICE: 'var(--color-accent-blue)',
  ALLOCATION: 'var(--color-accent-purple)',
  POLICY: 'var(--color-accent-green)',
  ENDORSEMENT: 'var(--color-accent-orange)',
  UW_ASSIGNMENT: 'var(--color-accent-cyan)',
  ACCOUNTS_QUEUE: '#ec4899',
};

export function TopBar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const { data: notifData } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notifData?.data || [];
  const unreadCount = notifData?.unreadCount ?? notifications.filter((n: any) => !n.isRead).length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) markRead.mutate(notif.id);
    if (notif.entityId && notif.entityType) {
      // Only use entityId in URL when the ID matches the target resource type
      const directRoutes: Record<string, string> = {
        lead: `/sales/leads/${notif.entityId}`,
        customer: `/customers/${notif.entityId}`,
      };
      // For entity types where entityId is NOT a customer ID, navigate to the relevant list page
      const listRoutes: Record<string, string> = {
        policy: '/underwriting/policies',
        endorsement: '/sales/leads',
        invoice: '/accounts/approval',
        uw_assignment: '/underwriting/in-progress',
        accounts_queue: '/accounts/approval',
      };
      const route = directRoutes[notif.entityType] || listRoutes[notif.entityType];
      if (route) router.push(route);
    }
    setShowNotifications(false);
  };

  return (
    <header
      className="flex items-center justify-between px-4 py-2 h-14"
      style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-default)' }}
    >
      {/* Left: Logo + Portal Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-cyan))' }}
          >
            <Anchor size={16} />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Oceanus
          </span>
        </div>
        <PortalBar />
      </div>

      {/* Center: Global Search */}
      {user && (
        <div className="flex-1 flex justify-center px-4">
          <GlobalSearch />
        </div>
      )}

      {/* Right: Notifications + User info + Logout */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'var(--color-accent-red)' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 rounded-xl shadow-xl overflow-hidden z-50"
                style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)' }}>
                <div className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllRead.mutate()}
                      className="flex items-center gap-1 text-[10px] font-medium hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-accent-blue, #3b82f6)' }}>
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-80">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No notifications</span>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((n: any) => (
                      <button key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="w-full text-left px-3 py-2.5 hover:opacity-90 transition-opacity flex gap-2.5"
                        style={{
                          borderBottom: '1px solid var(--color-border-default)',
                          background: n.isRead ? 'transparent' : 'rgba(59,130,246,0.04)',
                        }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: n.isRead ? 'transparent' : (TYPE_COLORS[n.type] || '#6b7280') }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {n.title}
                          </div>
                          <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {n.body}
                          </div>
                          <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        {!n.isRead && (
                          <button onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                            className="p-1 rounded hover:opacity-70 flex-shrink-0" title="Mark as read"
                            style={{ color: 'var(--color-text-muted)' }}>
                            <Check size={12} />
                          </button>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {user && (
          <div className="text-right mr-2">
            <div className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user.name}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {user.role?.replace('_', ' ')}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent-red)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
