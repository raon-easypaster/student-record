import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  TrendingUp,
  CheckSquare,
  SearchCode,
  FolderOpen,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { profile, signOut } = useActiveSemester();
  const navigate = useNavigate();

  const menuItems = [
    { name: '종합 대시보드', path: '/', icon: LayoutDashboard },
    { name: '성적 관리', path: '/academic', icon: GraduationCap },
    { name: '생기부 활동', path: '/activities', icon: FileText },
    { name: '성장 추이', path: '/growth', icon: TrendingUp },
    { name: '학기 목표', path: '/goals', icon: CheckSquare },
    { name: '대학·학과 분석', path: '/university', icon: SearchCode },
    { name: '참고 자료실', path: '/library', icon: FolderOpen },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-brand-600 p-2 rounded-xl text-white">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base tracking-tight">생기부 Master</h1>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Pass to College</p>
        </div>
      </div>

      {/* Navigation Menus */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30'
                    : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-white truncate">{profile?.name || '학생'}</h4>
            <p className="text-[11px] text-slate-500 truncate">{profile?.career_wish || '희망 진로를 설정해주세요'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-red-950/40 hover:text-red-400 text-slate-400 border border-slate-700 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
};
