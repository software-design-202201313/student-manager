import { useAuthStore } from '../../stores/authStore';
import { logout } from '../../api/auth';
import NotificationBell from '../notifications/NotificationBell';

export default function Header({ 
  onToggleMobile, 
  onToggleDesktop 
}: { 
  onToggleMobile: () => void;
  onToggleDesktop: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const doLogout = useAuthStore((s) => s.logout);

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-white sticky top-0 z-10 w-full shrink-0">
      <div className="flex items-center gap-3">
        {/* Toggle Button for Mobile */}
        <button
          type="button"
          className="md:hidden p-2 rounded-md border text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Toggle mobile menu"
          onClick={onToggleMobile}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>

        {/* Toggle Button for Desktop */}
        <button
          type="button"
          className="hidden md:block p-2 rounded-md border text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Toggle desktop menu"
          onClick={onToggleDesktop}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
        </div>
        <button
          className="text-sm px-3 py-1.5 border hover:bg-gray-50 rounded-md transition-colors text-gray-600 font-medium ml-2"
          onClick={async () => {
            await logout();
            doLogout();
            window.location.href = '/login';
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
