import { useState } from 'react';

export default function SpecialNoteForm({ onSubmit }: { onSubmit: (body: { content: string }) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ content });
      setContent('');
    } catch (e: any) {
      setError(e.response?.data?.detail || '저장 실패');
    }
  };

  return (
    <form onSubmit={handle} className="flex gap-2 items-end text-sm">
      {error && <div className="text-red-600">{error}</div>}
      <div className="flex-1">
        <label className="block text-gray-600">특기사항</label>
        <input className="border p-1 w-full" value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>
      <button className="border px-3 py-1 rounded">추가</button>
    </form>
  );
}

