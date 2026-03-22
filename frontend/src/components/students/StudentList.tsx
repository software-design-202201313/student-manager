import { Link } from 'react-router-dom';
import type { StudentSummary } from '../../types';

export default function StudentList({ students }: { students: StudentSummary[] }) {
  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-2 border">번호</th>
          <th className="p-2 border">이름</th>
          <th className="p-2 border">동작</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s) => (
          <tr key={s.id} className="border-b">
            <td className="p-2 border text-center">{s.student_number}</td>
            <td className="p-2 border">{s.name}</td>
            <td className="p-2 border space-x-2">
              <Link className="text-blue-600 underline" to={`/students/${s.id}`}>상세</Link>
              <Link className="text-blue-600 underline" to={`/grades/${s.id}`}>성적</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

