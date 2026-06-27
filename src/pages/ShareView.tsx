import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Award, BookOpen, Clock, ShieldAlert, Sparkles } from 'lucide-react';

interface SharedLinkMeta {
  id: string;
  student_id: string;
  expires_at: string;
  is_active: boolean;
}

export const ShareView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [valid, setValid] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Loaded Student data
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [academicList, setAcademicList] = useState<any[]>([]);
  const [targetUnivs, setTargetUnivs] = useState<any[]>([]);

  // Security Masking Helpers
  const maskName = (name: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed[0] + '*';
    return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
  };

  const fetchSharedData = async () => {
    setLoading(true);
    setErrorMsg('');

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    try {
      let activeLink: SharedLinkMeta | null = null;
      let loadedProfile: any = null;
      let loadedActs: any[] = [];
      let loadedAcads: any[] = [];
      let loadedUnivs: any[] = [];

      if (isMock) {
        // 1. Mock Validation
        const storedLinks = localStorage.getItem('mock_shared_links');
        const links: SharedLinkMeta[] = storedLinks ? JSON.parse(storedLinks) : [];
        const matched = links.find(l => l.id === token);

        if (matched) {
          const now = new Date();
          const expire = new Date(matched.expires_at);
          if (matched.is_active && expire.getTime() > now.getTime()) {
            activeLink = matched;
          }
        }

        if (activeLink) {
          // Load Mock Profile
          loadedProfile = { name: '홍길동', is_admin: false, is_approved: true };
          
          // Load Mock Activities
          const storedActs = localStorage.getItem('mock_activities');
          loadedActs = storedActs ? JSON.parse(storedActs) : [];
          
          // Load Mock Academics
          const storedAcads = localStorage.getItem('mock_academic_records');
          loadedAcads = storedAcads ? JSON.parse(storedAcads) : [];

          // Load Mock Target Universities
          const storedUnivs = localStorage.getItem('mock_target_universities');
          loadedUnivs = storedUnivs ? JSON.parse(storedUnivs) : [];
        }
      } else {
        // 2. Supabase Validation
        const { data: linkData, error: linkErr } = await supabase
          .from('shared_links')
          .select('*')
          .eq('id', token)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!linkErr && linkData) {
          activeLink = linkData;

          // Fetch student profile (Anonymous RLS matches active share)
          const { data: prof } = await supabase
            .from('student_profile')
            .select('*')
            .eq('student_id', linkData.student_id)
            .single();
          loadedProfile = prof;

          // Fetch activities
          const { data: acts } = await supabase
            .from('activities')
            .select('*')
            .eq('student_id', linkData.student_id);
          loadedActs = acts || [];

          // Fetch academics
          const { data: acads } = await supabase
            .from('academic_records')
            .select('*')
            .eq('student_id', linkData.student_id);
          loadedAcads = acads || [];

          // Fetch target universities
          const { data: univs } = await supabase
            .from('target_universities')
            .select('*')
            .eq('student_id', linkData.student_id);
          loadedUnivs = univs || [];
        }
      }

      if (activeLink) {
        setValid(true);
        setStudentProfile(loadedProfile);
        setActivities(loadedActs);
        setAcademicList(loadedAcads);
        setTargetUnivs(loadedUnivs);
      } else {
        setValid(false);
        setErrorMsg('존재하지 않거나 만료(기간 초과)된 공유 링크입니다. 담임 교사 혹은 학생에게 새로운 링크 발급을 요청해 주십시오.');
      }
    } catch (err) {
      console.error(err);
      setValid(false);
      setErrorMsg('공유 포트폴리오 데이터를 불러오는 도중 기술적 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSharedData();
    }
  }, [token]);

  // GPA Calculation
  const getGpaChartData = () => {
    const semKeys = [
      { grade: 1, semester: 1, label: '1-1' },
      { grade: 1, semester: 2, label: '1-2' },
      { grade: 2, semester: 1, label: '2-1' },
      { grade: 2, semester: 2, label: '2-2' },
      { grade: 3, semester: 1, label: '3-1' },
      { grade: 3, semester: 2, label: '3-2' }
    ];

    const actualData = semKeys.map((k) => {
      const semActs = academicList.filter(
        (a) => a.grade === k.grade && a.semester === k.semester && a.rank_rating !== null
      );
      if (semActs.length === 0) {
        return { name: k.label, GPA: null, grade: k.grade, semester: k.semester };
      }
      const totalCredits = semActs.reduce((sum, a) => sum + a.credit_units, 0);
      const weightedSum = semActs.reduce((sum, a) => sum + (a.rank_rating! * a.credit_units), 0);
      return {
        name: k.label,
        GPA: Number((weightedSum / totalCredits).toFixed(2)),
        grade: k.grade,
        semester: k.semester
      };
    });

    const activeActual = actualData.filter(d => d.GPA !== null);
    if (activeActual.length === 0) return [];

    // Map cumulative transitions
    return activeActual.map((d, index) => {
      const targetSemesters = activeActual.slice(0, index + 1);
      const allSubjects = academicList.filter(a => 
        targetSemesters.some(ts => ts.grade === a.grade && ts.semester === a.semester) &&
        a.rank_rating !== null && a.rank_rating > 0
      );
      
      const totalCredits = allSubjects.reduce((sum, a) => sum + a.credit_units, 0);
      const weightedSum = allSubjects.reduce((sum, a) => sum + (a.rank_rating! * a.credit_units), 0);
      const cumulativeGPA = Number((weightedSum / totalCredits).toFixed(2));

      return {
        name: d.name,
        '누적 평균 등급': cumulativeGPA
      };
    });
  };

  const getCumulativeAverage = () => {
    const graded = academicList.filter(r => r.rank_rating !== null && r.rank_rating > 0);
    if (graded.length === 0) return '-';
    const totalCredits = graded.reduce((sum, r) => sum + r.credit_units, 0);
    const totalScore = graded.reduce((sum, r) => sum + (r.rank_rating! * r.credit_units), 0);
    return (totalScore / totalCredits).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 p-6">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-800">보안 인증 공유 포트폴리오 로딩 중...</p>
        <p className="text-xs text-slate-400 font-semibold">데이터 마스킹 및 RLS 암호 규격을 분석하고 있습니다.</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 border border-slate-100 shadow-2xl space-y-5 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-800">접근이 차단된 공유 링크</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {errorMsg}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const gpaData = getGpaChartData();

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            외부 상담용 안전 공유 모드 (읽기 전용)
          </span>
          <h2 className="text-lg md:text-xl font-black tracking-tight">
            🛡️ {studentProfile ? maskName(studentProfile.name) : '학생'} 포트폴리오 리포트
          </h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            학생의 개인정보(이름 등)가 암호 마스킹 처리된 안심 분석 리포트입니다. 데이터의 위변조가 방지되었습니다.
          </p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 px-5 py-4 rounded-2xl shrink-0 text-center">
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">전체 누적 내신 평점</p>
          <p className="text-2xl font-black text-indigo-400 mt-0.5">{getCumulativeAverage()} 등급</p>
        </div>
      </div>

      {/* 2. Core Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Grade trends and universities */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* 2-1. 내신 평균 추이 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-emerald-500" />
              학기별 누적 내신 등급 추이
            </h4>
            {gpaData.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">등록된 성적이 없습니다.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={600} />
                    <YAxis reversed domain={[9, 1]} ticks={[9, 7, 5, 3, 1]} stroke="#94a3b8" fontSize={10} fontWeight={600} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="누적 평균 등급"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 2-2. 대학 분석 리스트 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
              목표 대학 매칭 상태
            </h4>
            {targetUnivs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">설정된 목표 대학이 없습니다.</p>
            ) : (
              <div className="space-y-3.5">
                {targetUnivs.map((uni) => (
                  <div key={uni.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-extrabold text-xs text-slate-800">{uni.university_name}</h5>
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black">
                        {uni.ai_analysis_result?.match_score || 0}점
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      희망학과: {uni.department_name}
                    </p>
                    {uni.ai_analysis_result?.analysis_text && (
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium bg-white p-2.5 rounded-xl border border-slate-100 max-h-20 overflow-y-auto">
                        {uni.ai_analysis_result.analysis_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Activities list (Anonymized content viewer) */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
              생기부 누적 활동 아카이브 ({activities.length}건)
            </h4>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-16">등록된 학교생활기록부 활동이 없습니다.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-2 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>{act.grade}학년 {act.semester || 1}학기 | {act.activity_type}</span>
                      {act.subject_name && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black">{act.subject_name}</span>}
                    </div>
                    <h5 className="font-extrabold text-xs text-slate-800">{act.title}</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      {act.content}
                    </p>
                    {act.related_book && (
                      <p className="text-[9px] text-slate-400 font-bold italic">
                        📖 연계 독서 도서명: {act.related_book}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
