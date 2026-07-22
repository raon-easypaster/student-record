import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import { Sidebar } from './Sidebar';
import { GradeSelector } from './GradeSelector';

export const Layout: React.FC = () => {
  const { user, profile, loading } = useActiveSemester();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium text-sm">정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Login.tsx will be loaded by Route
  }

  if (profile && !profile.is_approved) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center border border-slate-100/60">
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">가입 승인 대기 중</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            관리자의 가입 승인이 완료된 후 이용하실 수 있습니다.<br/>아래 버튼을 눌러 정기 결제 카드를 등록하시면 즉시 승인 처리됩니다.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/pricing')}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
            >
              구독 요금제 결제 및 카드 등록
            </button>
            <button 
              onClick={() => {
                supabase.auth.signOut();
                localStorage.removeItem('mock_user_active');
                window.location.href = '/login';
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine current page title
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/': return '종합 대시보드';
      case '/academic': return '성적 관리';
      case '/activities': return '생기부 활동 기록';
      case '/growth': return '학년별 성장 추이';
      case '/goals': return '학기별 목표 체크리스트';
      case '/university': return '대학·학과 분석';
      case '/library': return '참고 자료실';
      default: return '생기부 Master';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="bg-white border-b border-slate-200 h-20 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-slate-100/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {getPageTitle(location.pathname)}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">3개년 통합 진로 설계 플랫폼</p>
          </div>

          {/* Global Grade & Semester Selector */}
          <GradeSelector />
        </header>

        {/* Dynamic Inner Page */}
        <main className="flex-1 p-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
