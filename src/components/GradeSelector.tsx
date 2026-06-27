import React from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { GraduationCap } from 'lucide-react';

export const GradeSelector: React.FC = () => {
  const { activeGrade, activeSemester, setActiveGrade, setActiveSemester, profile } = useActiveSemester();

  return (
    <div className="flex flex-wrap items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
      {/* Student Badge Info */}
      {profile && (
        <div className="flex items-center gap-2 border-r border-slate-100 pr-4 mr-2">
          <div className="bg-brand-50 p-1.5 rounded-lg text-brand-600">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">{profile.name}</p>
            <p className="text-[10px] text-slate-400 font-medium">현재 {profile.current_grade}학년 {profile.current_class ? `${profile.current_class}반` : ''}</p>
          </div>
        </div>
      )}

      {/* Grade Selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-500 mr-1.5">학년</span>
        {[1, 2, 3].map((g) => (
          <button
            key={g}
            onClick={() => setActiveGrade(g)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeGrade === g
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-100'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {g}학년
          </button>
        ))}
      </div>

      <div className="h-4 w-[1px] bg-slate-200" />

      {/* Semester Selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-500 mr-1.5">학기</span>
        {[1, 2].map((s) => (
          <button
            key={s}
            onClick={() => setActiveSemester(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSemester === s
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-100'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s}학기
          </button>
        ))}
      </div>
    </div>
  );
};
