import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

const radarData = [
  { subject: '수학', score: 95, fullMark: 100 },
  { subject: '국어', score: 88, fullMark: 100 },
  { subject: '영어', score: 92, fullMark: 100 },
  { subject: '과학', score: 85, fullMark: 100 },
  { subject: '사회', score: 90, fullMark: 100 },
];

const radarDataEn = [
  { subject: 'Math', score: 95, fullMark: 100 },
  { subject: 'Korean', score: 88, fullMark: 100 },
  { subject: 'English', score: 92, fullMark: 100 },
  { subject: 'Science', score: 85, fullMark: 100 },
  { subject: 'History', score: 90, fullMark: 100 },
];

export default function LandingPage() {
  const navigate = useNavigate();
  type Language = 'en' | 'ko';
  const [lang, setLang] = useState<Language>('ko');

  useEffect(() => {
    const saved = localStorage.getItem('landing_lang');
    if (saved === 'en' || saved === 'ko') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('landing_lang', lang);
  }, [lang]);

  const t = useMemo(() => {
    if (lang === 'ko') {
      return {
        login: '로그인',
        headline: '학생 데이터를 다루는\n가장 우아한 방법.',
        desc: '성적, 학생부, 그리고 교사 간의 긴밀한 상담 내역까지.\n하나의 통합된 공간에서 직관적으로 관리하세요.',
        demoBtn: '데모 신청하기',
        counseling: '상담 기록 공유',
        counselMsg1: '김민수 학생 진로 상담 완료. 세부 목표 설정함.',
        counselMsg2: '수학 성적 향상 방안 논의 필요.',
        stats: '성적 다각화 분석',
        records: '학생부 인사이트',
        recordTag1: '자기주도학습',
        recordTag2: '리더십',
        tagline: 'Student Manager'
      };
    }
    return {
      login: 'Log in',
      headline: 'The most elegant way\nto manage student data.',
      desc: 'Grades, records, and precise teacher counseling workflows.\nManage everything intuitively in one unified workspace.',
      demoBtn: 'Book a demo',
      counseling: 'Counseling Log',
      counselMsg1: 'Minsoo career counseling completed. Goals set.',
      counselMsg2: 'Need to discuss math grade improvements.',
      stats: 'Grade Analytics',
      records: 'Student Records',
      recordTag1: 'Self-driven',
      recordTag2: 'Leadership',
      tagline: 'Student Manager'
    };
  }, [lang]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full sticky top-0 bg-gray-50/80 backdrop-blur-md z-50">
        <div className="font-bold tracking-tight text-xl text-gray-900 flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md shadow-sm"></div>
          {t.tagline}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            {lang === 'ko' ? 'EN' : 'KO'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow hover:border-gray-300 transition-all text-gray-800"
          >
            {t.login}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-32">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight whitespace-pre-wrap mb-6">
            {t.headline}
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 whitespace-pre-wrap leading-relaxed">
            {t.desc}
          </p>
          <div className="flex justify-center">
            <button
              className="px-8 py-3.5 bg-gray-900 text-white rounded-full font-semibold shadow-lg hover:bg-gray-800 hover:scale-105 hover:shadow-xl transition-all duration-300 transform"
              onClick={() => window.alert('Demo booking placeholder')}
            >
              {t.demoBtn}
            </button>
          </div>
        </section>

        {/* Features Bento Box */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px]">
          
          {/* Card 1: Radar Chart (Grades) */}
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow duration-300 group relative overflow-hidden">
            <div className="z-10">
              <h3 className="font-bold text-xl text-gray-900 mb-2">{t.stats}</h3>
              <p className="text-gray-500 text-sm">Visualize multidimensional academic performance.</p>
            </div>
            <div className="flex-1 w-full mt-4 -ml-4 relative z-0 transition-transform duration-700 ease-out group-hover:scale-105">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={lang === 'ko' ? radarData : radarDataEn}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 13 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Student A"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="#3b82f6"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Student Records Mock */}
          <div className="md:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow duration-300 group">
            <div>
              <h3 className="font-bold text-xl text-gray-900 mb-8">{t.records}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl transform transition-transform group-hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">SM</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">손흥민 (Son)</p>
                    <p className="text-xs text-gray-500">2nd Grade, Class 3</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{t.recordTag1}</span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">{t.recordTag2}</span>
                </div>
              </div>
            </div>
            <div className="w-full h-24 bg-gradient-to-t from-white to-transparent absolute bottom-0 left-0 rounded-b-3xl pointer-events-none"></div>
          </div>

          {/* Card 3: Collaborative Counseling */}
          <div className="md:col-span-3 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center hover:shadow-md transition-shadow duration-300 group">
            <div className="md:w-1/3">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">{t.counseling}</h3>
              <p className="text-gray-500 text-sm">Real-time notes syncing across all teachers securely.</p>
            </div>
            
            <div className="md:w-2/3 w-full bg-gray-50 rounded-2xl p-6 relative overflow-hidden">
               <div className="space-y-4 relative z-10 transition-transform duration-700 group-hover:translate-x-2">
                 <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-200 flex-shrink-0"></div>
                   <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-700 w-fit">
                     {t.counselMsg1}
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-pink-200 flex-shrink-0"></div>
                   <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-700 w-fit">
                     {t.counselMsg2}
                   </div>
                 </div>
               </div>
               {/* Decorative dots */}
               <div className="absolute top-4 right-4 text-gray-200">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor"><path d="M8 8h4v4H8zM24 8h4v4h-4zM40 8h4v4h-4zM56 8h4v4h-4zM8 24h4v4H8zM24 24h4v4h-4zM40 24h4v4h-4zM56 24h4v4h-4zM8 40h4v4H8zM24 40h4v4h-4zM40 40h4v4h-4zM56 40h4v4h-4zM8 56h4v4H8zM24 56h4v4h-4zM40 56h4v4h-4zM56 56h4v4h-4z" opacity="0.5"/></svg>
               </div>
            </div>
          </div>

        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div>© 2026 Student Manager. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
