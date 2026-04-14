import { useNavigate } from 'react-router-dom';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

const radarData = [
  { subject: '수학', score: 95, prevScore: 82, fullMark: 100 },
  { subject: '국어', score: 88, prevScore: 85, fullMark: 100 },
  { subject: '영어', score: 92, prevScore: 78, fullMark: 100 },
  { subject: '과학', score: 85, prevScore: 88, fullMark: 100 },
  { subject: '사회', score: 90, prevScore: 84, fullMark: 100 },
];

const radarDataEn = [
  { subject: 'Math', score: 95, prevScore: 82, fullMark: 100 },
  { subject: 'Korean', score: 88, prevScore: 85, fullMark: 100 },
  { subject: 'English', score: 92, prevScore: 78, fullMark: 100 },
  { subject: 'Science', score: 85, prevScore: 88, fullMark: 100 },
  { subject: 'History', score: 90, prevScore: 84, fullMark: 100 },
];

function FadeInSection({ children, direction = 'up' }: { children: React.ReactNode, direction?: 'up'|'left'|'right' }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, { threshold: 0.15 });
    
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);
  
  let translateClass = 'translate-y-16';
  if (direction === 'left') translateClass = '-translate-x-16';
  if (direction === 'right') translateClass = 'translate-x-16';

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${translateClass}`
      }`}
    >
      {children}
    </div>
  );
}

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
        headline: <><span className="text-blue-600">학생 데이터</span>를 다루는<br/>가장 우아한 방법.</>,
        desc: '성적, 학생부, 그리고 교사 간의 긴밀한 상담 내역까지.\n하나의 통합된 공간에서 직관적으로 관리하세요.',
        demoBtn: '데모 신청하기',
        
        feature1_title: '학생 성적 관리',
        feature1_desc: '다각화된 성적 분석으로 학습 방향을 제시합니다.',
        
        feature2_title: '학생부 관리',
        feature2_desc: '기본 정보와 특기사항을 안전하게 누적 기록합니다.',
        feature2_name: '김민수 (Minsoo)',
        feature2_info: '2학년 3반 12번',
        feature2_stat1: '출석률 100%',
        feature2_stat2: '자기주도학습 우수',

        feature3_title: '피드백 제공',
        feature3_desc: '행동, 출결, 태도에 관한 긍정적이고 객관적인 피드백.',
        feature3_badge1: '수업 태도 우수',
        feature3_badge2: '성실한 과제 수행',
        feature3_badge3: '리더십',

        feature4_title: '상담 내역 관리',
        feature4_desc: '보안이 철저한 교사 간 실시간 상담 기록 공유.',
        feature4_msg1: '진로 상담 완료. 컴퓨터 공학과 진학 희망.',
        feature4_msg2: '다음 주 학부모 상담 배정 완료.',
      };
    }
    return {
      login: 'Log in',
      headline: <><span className="text-blue-600">Student data</span><br/>managed elegantly.</>,
      desc: 'Grades, records, and precise teacher counseling workflows.\nManage everything intuitively in one unified workspace.',
      demoBtn: 'Book a demo',
      
      feature1_title: 'Grade Analytics',
      feature1_desc: 'Provide learning direction with multidimensional analysis.',
      
      feature2_title: 'Student Records',
      feature2_desc: 'Securely accumulate basic info and special notes.',
      feature2_name: 'Minsoo Kim',
      feature2_info: 'Grade 2, Class 3, No.12',
      feature2_stat1: '100% Attendance',
      feature2_stat2: 'Self-directed learner',

      feature3_title: 'Feedback System',
      feature3_desc: 'Objective positive feedback on behavior and attitude.',
      feature3_badge1: 'Excellent Attitude',
      feature3_badge2: 'Diligent Homework',
      feature3_badge3: 'Leadership',

      feature4_title: 'Counseling Logs',
      feature4_desc: 'Secure real-time counseling records sharing among teachers.',
      feature4_msg1: 'Career counseling done. Wants CS major.',
      feature4_msg2: 'Parent meeting scheduled for next week.',
    };
  }, [lang]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Navigation */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full sticky top-0 bg-gray-50/80 backdrop-blur-md z-50">
        <div className="font-semibold tracking-tighter text-2xl text-gray-900 select-none">
          ClassFlow
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors"
          >
            {lang === 'ko' ? 'EN' : 'KO'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium px-5 py-2 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all text-gray-800"
          >
            {t.login}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        
        {/* Full Viewport Hero Section */}
        <div className="min-h-[calc(100vh-76px)] flex items-center justify-center -mt-10">
          <section className="text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 w-full">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.2] whitespace-pre-wrap mb-6">
              {t.headline}
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 whitespace-pre-wrap leading-relaxed">
              {t.desc}
            </p>
            <div className="flex justify-center">
              <button
                className="px-8 py-4 bg-gray-900 text-white rounded-full font-semibold shadow-lg hover:bg-gray-800 hover:scale-105 transition-all duration-300 transform"
                onClick={() => window.alert('Demo booking placeholder')}
              >
                {t.demoBtn}
              </button>
            </div>
          </section>
        </div>

        {/* Feature Sections Stacked & Alternating */}
        <div className="py-20 space-y-32 mb-32">
          
          {/* Feature 1: Left Text, Right Visual */}
          <FadeInSection direction="left">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2 flex flex-col items-start text-left">
                <h3 className="font-bold text-3xl md:text-4xl text-gray-900 mb-4">{t.feature1_title}</h3>
                <p className="text-lg text-gray-500 leading-relaxed max-w-md">{t.feature1_desc}</p>
              </div>
              <div className="md:w-1/2 flex justify-center w-full">
                <div className="w-full max-w-md h-64 md:h-80 hover:scale-105 transition-transform duration-500">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={lang === 'ko' ? radarData : radarDataEn}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 13 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Previous" dataKey="prevScore" stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" fill="#fdba74" fillOpacity={0.15} />
                      <Radar name="Current" dataKey="score" stroke="#2563eb" strokeWidth={2} fill="#3b82f6" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Feature 2: Right Text, Left Visual */}
          <FadeInSection direction="right">
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="md:w-1/2 flex flex-col items-start md:items-end text-left md:text-right">
                <h3 className="font-bold text-3xl md:text-4xl text-gray-900 mb-4">{t.feature2_title}</h3>
                <p className="text-lg text-gray-500 leading-relaxed max-w-md">{t.feature2_desc}</p>
              </div>
              <div className="md:w-1/2 flex justify-center w-full">
                <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-500 hover:-translate-y-2 cursor-default">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0">MK</div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-gray-900">{t.feature2_name}</p>
                      <p className="text-sm text-gray-500">{t.feature2_info}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <p className="text-sm font-medium text-gray-700">{t.feature2_stat1}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <p className="text-sm font-medium text-gray-700">{t.feature2_stat2}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Feature 3: Left Text, Right Visual */}
          <FadeInSection direction="left">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/2 flex flex-col items-start text-left">
                <h3 className="font-bold text-3xl md:text-4xl text-gray-900 mb-4">{t.feature3_title}</h3>
                <p className="text-lg text-gray-500 leading-relaxed max-w-md">{t.feature3_desc}</p>
              </div>
              <div className="md:w-1/2 flex justify-center w-full">
                <div className="flex flex-col gap-4 w-full max-w-sm hover:-translate-y-2 transition-transform duration-500 cursor-default">
                  <div className="px-5 py-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 font-medium flex justify-between items-center shadow-sm">
                    {t.feature3_badge1}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div className="px-5 py-4 bg-indigo-50 text-indigo-800 rounded-2xl border border-indigo-100 font-medium flex justify-between items-center shadow-sm">
                    {t.feature3_badge2}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div className="px-5 py-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 font-medium flex justify-between items-center shadow-sm">
                    {t.feature3_badge3}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Feature 4: Right Text, Left Visual */}
          <FadeInSection direction="right">
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="md:w-1/2 flex flex-col items-start md:items-end text-left md:text-right">
                <h3 className="font-bold text-3xl md:text-4xl text-gray-900 mb-4">{t.feature4_title}</h3>
                <p className="text-lg text-gray-500 leading-relaxed max-w-md">{t.feature4_desc}</p>
              </div>
              <div className="md:w-1/2 flex justify-center w-full">
                <div className="w-full max-w-sm space-y-4 hover:-translate-y-2 transition-transform duration-500 cursor-default">
                  {/* Bubble 1 */}
                  <div className="flex gap-3 items-end">
                    <div className="w-8 h-8 rounded-full bg-blue-200 flex-shrink-0 mb-1"></div>
                    <div className="bg-white text-gray-800 px-5 py-4 rounded-2xl rounded-bl-sm text-sm border border-gray-100 shadow-sm leading-relaxed text-left">
                      {t.feature4_msg1}
                    </div>
                  </div>
                  {/* Bubble 2 */}
                  <div className="flex gap-3 items-end justify-end">
                    <div className="bg-blue-600 text-white px-5 py-4 rounded-2xl rounded-br-sm text-sm shadow-sm leading-relaxed text-right">
                      {t.feature4_msg2}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex-shrink-0 mb-1"></div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>

        </div>
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
