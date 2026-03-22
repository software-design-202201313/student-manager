import { useEffect, useState } from 'react';
import { listClasses } from '../api/classes';
import { useStudents } from '../hooks/useStudents';
import StudentList from '../components/students/StudentList';
import type { ClassSummary } from '../types';

export default function StudentListPage() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const { data: students, isLoading } = useStudents(classId);

  useEffect(() => {
    (async () => {
      try {
        const cls = await listClasses();
        setClasses(cls);
        if (cls.length > 0 && !classId) setClassId(cls[0].id);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">학생 목록</h1>
      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-600">학급 선택</label>
        <select className="border p-1" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{`${c.year}학년도 ${c.grade}학년 ${c.name}`}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div>불러오는 중...</div>
      ) : students ? (
        <StudentList students={students} />
      ) : (
        <div>학생이 없습니다.</div>
      )}
    </div>
  );
}

