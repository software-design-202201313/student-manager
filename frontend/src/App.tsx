import { Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import StudentListPage from './pages/StudentListPage';
import StudentDetailPage from './pages/StudentDetailPage';
import GradesPage from './pages/GradesPage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<div>Dashboard</div>} />
                <Route path="/students" element={<StudentListPage />} />
                <Route path="/students/:studentId" element={<StudentDetailPage />} />
                <Route path="/grades/:studentId" element={<GradesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
