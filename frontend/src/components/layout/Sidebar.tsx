import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-100 p-4 space-y-2">
      <div className="font-bold">Menu</div>
      <nav className="flex flex-col space-y-1">
        <Link to="/">Dashboard</Link>
        <Link to="/students">Students</Link>
        <Link to="/grades">Grades</Link>
        <Link to="/feedbacks">Feedback</Link>
        <Link to="/counselings">Counseling</Link>
        <Link to="/notifications">Notifications</Link>
      </nav>
    </aside>
  );
}

