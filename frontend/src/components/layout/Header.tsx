import { useAuthStore } from '../../stores/authStore';
import { logout } from '../../api/auth';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const doLogout = useAuthStore((s) => s.logout);
  return (
    <header className="h-12 border-b flex items-center justify-between px-4">
      <div className="font-semibold">Student Manager</div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user?.name}</span>
        <button
          className="text-sm px-2 py-1 border rounded"
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

