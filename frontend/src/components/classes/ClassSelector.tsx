import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes';
import type { ClassSummary } from '../../types';

interface ClassSelectorProps {
  value: string;
  onChange: (classId: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export default function ClassSelector({
  value,
  onChange,
  disabled,
  required,
  placeholder = '학급 선택',
}: ClassSelectorProps) {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listClasses();
        if (mounted) setClasses(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <select
      className="border w-full p-1 text-sm bg-white disabled:bg-gray-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      required={required}
    >
      <option value="">{loading ? '학급 목록 불러오는 중...' : placeholder}</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>{`${c.year}학년도 ${c.grade}학년 ${c.name}`}</option>
      ))}
    </select>
  );
}

