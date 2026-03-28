import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  type Language = 'en' | 'ko';
  const [lang, setLang] = useState<Language>('en');
  const [menuOpen, setMenuOpen] = useState(false);

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
        headline: '학생 데이터를 위한 운영체제',
        desc1: '성적, 행동, 인사이트를 하나의 지능형 시스템으로 통합하세요.',
        desc2: '실시간 학생 데이터로 더 나은 결정을 내릴 수 있습니다.',
        demo: '데모 신청',
      } as const;
    }
    return {
      headline: 'The Operating System for Student Data',
      desc1: 'Unify grades, behavior, and insights into one intelligent system.',
      desc2: 'Make better decisions with real-time student data.',
      demo: 'Book a demo',
    } as const;
  }, [lang]);
  return (
    <div className="min-h-screen bg-[#0b0f16] text-white relative overflow-hidden flex flex-col">
      {/* Soft aurora/rays background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 20% 80%, rgba(255,95,109,0.35), transparent 60%), radial-gradient(1000px 500px at 80% 85%, rgba(72,149,239,0.35), transparent 60%), radial-gradient(800px 400px at 50% 50%, rgba(255,255,255,0.08), transparent 60%)',
          filter: 'blur(12px)',
        }}
      />

      {/* Top nav */}
      <header className="relative z-30 w-full px-6 py-5 flex items-center justify-between">
        <div className="font-black tracking-wider text-lg text-white/90">ClassFlow</div>
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button
              className="inline-flex items-center rounded-md border border-white/30 bg-white/0 text-white px-3 py-2 text-sm font-medium hover:bg-white/10"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              Language
              <span className="ml-2 text-white/60">{lang.toUpperCase()}</span>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-36 rounded-md border border-white/20 bg-[#111827] shadow z-20"
                role="menu"
              >
                <button
                  onClick={() => {
                    setLang('ko');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  role="menuitem"
                >
                  한국어
                </button>
                <button
                  onClick={() => {
                    setLang('en');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  role="menuitem"
                >
                  English
                </button>
              </div>
            )}
          </div>
          <button
            className="inline-flex items-center rounded-md border border-white/30 bg-white/0 text-white px-4 py-2 text-sm font-medium hover:bg-white/10"
            onClick={() => navigate('/login')}
            aria-label="login"
          >
            login
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-4xl w-full px-6 flex-1 flex flex-col items-center justify-center text-center -mt-8 md:-mt-12">
        <h1
          className={`text-4xl md:text-6xl tracking-tight leading-tight mb-6 ${
            lang === 'en' ? 'font-playfair italic' : 'font-sans not-italic'
          }`}
        >
          {lang === 'en' ? (
            <>
              The Operating System for
              <br />
              Student Data
            </>
          ) : (
            t.headline
          )}
        </h1>
        <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          {t.desc1}
          <br />
          {t.desc2}
        </p>
        <div className="flex justify-center">
          <button
            className="rounded-md bg-white text-gray-900 px-6 py-3 text-sm font-medium hover:bg-white/90 shadow"
            onClick={() => window.alert('Demo booking placeholder')}
          >
            {t.demo}
          </button>
        </div>
      </main>

      {/* No extra footer spacing to keep vertical centering */}
    </div>
  );
}
