import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { Sidebar } from './Sidebar';
import { GradeSelector } from './GradeSelector';

export const Layout: React.FC = () => {
  const { user, loading } = useActiveSemester();
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
