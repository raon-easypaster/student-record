import React, { useState, useEffect } from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import {
  User as UserIcon,
  Award,
  CheckSquare,
  FileText,
  FolderOpen,
  Calendar,
  ChevronRight,
  Sparkles,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  created_at: string;
}

interface Material {
  id: string;
  material_type: string;
  title: string;
  created_at: string;
}

interface Goal {
  id: string;
  content: string;
  status: '진행중' | '달성' | '미달성';
}

interface UnivAnalysis {
  id: string;
  university_name: string;
  department_name: string;
  ai_analysis_result: {
    match_score: number;
  };
}

export const Dashboard: React.FC = () => {
  const { activeGrade, activeSemester, profile, refreshProfile, user } = useActiveSemester();

  // --- Dashboard Data states ---
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recentAnalysis, setRecentAnalysis] = useState<UnivAnalysis | null>(null);

  // Transition Season states
  const [prevSemProgress, setPrevSemProgress] = useState<number | null>(null);
  const [prevSemLabel, setPrevSemLabel] = useState<string>('');
  const [showTransitionBanner, setShowTransitionBanner] = useState<boolean>(true); // Defaults to true for review, can be toggled by date

  // Editing profile fields
  const [isEditingCareer, setIsEditingCareer] = useState<boolean>(false);
  const [careerInput, setCareerInput] = useState<string>('');
  const [isEditingMemo, setIsEditingMemo] = useState<boolean>(false);
  const [memoInput, setMemoInput] = useState<string>('');

  // --- Admin Members Approval states ---
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  const fetchPendingUsers = async () => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    if (isMock) {
      const storedUsers = localStorage.getItem('mock_users');
      const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];
      setPendingUsers(mockUsers.filter((u: any) => !u.is_approved));
    } else {
      const { data, error } = await supabase
        .from('student_profile')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending users:', error);
      } else {
        setPendingUsers(data || []);
      }
    }
  };

  const handleApproveUser = async (userId: string) => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    try {
      if (isMock) {
        const storedUsers = localStorage.getItem('mock_users');
        const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];
        const updated = mockUsers.map((u: any) => u.id === userId ? { ...u, is_approved: true } : u);
        localStorage.setItem('mock_users', JSON.stringify(updated));
        alert('해당 모의 계정의 가입 신청이 즉시 승인되었습니다!');
        fetchPendingUsers();
      } else {
        const { error } = await supabase
          .from('student_profile')
          .update({ is_approved: true })
          .eq('id', userId);
        if (error) throw error;
        alert('해당 학생의 가입 승인이 완료되었습니다!');
        fetchPendingUsers();
      }
    } catch (err) {
      console.error(err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('정말 이 가입 신청을 거절하고 영구 삭제하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    try {
      if (isMock) {
        const storedUsers = localStorage.getItem('mock_users');
        const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];
        const updated = mockUsers.filter((u: any) => u.id !== userId);
        localStorage.setItem('mock_users', JSON.stringify(updated));
        alert('신청이 거절 및 파기되었습니다.');
        fetchPendingUsers();
      } else {
        const { error } = await supabase
          .from('student_profile')
          .delete()
          .eq('id', userId);
        if (error) throw error;
        alert('신청이 거절 및 파기되었습니다.');
        fetchPendingUsers();
      }
    } catch (err) {
      console.error(err);
      alert('거절 처리 중 오류가 발생했습니다.');
    }
  };

  const fetchDashboardData = async () => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    // Calculate previous semester parameters
    let prevG = activeGrade;
    let prevS = activeSemester - 1;
    if (prevS === 0) {
      prevG = activeGrade - 1;
      prevS = 2;
    }

    if (isMock) {
      // 1. Load Goals
      const storedGoals = localStorage.getItem('mock_goal_checkpoints');
      const loadedGoals: any[] = storedGoals ? JSON.parse(storedGoals) : [];
      setGoals(loadedGoals.filter((g: any) => g.grade === activeGrade && g.semester === activeSemester));

      // Calculate previous semester progress
      if (prevG >= 1) {
        const prevGoals = loadedGoals.filter((g: any) => g.grade === prevG && g.semester === prevS);
        setPrevSemLabel(`${prevG}학년 ${prevS}학기`);
        if (prevGoals.length > 0) {
          const done = prevGoals.filter((g: any) => g.status === '달성').length;
          setPrevSemProgress(Math.round((done / prevGoals.length) * 100));
        } else {
          setPrevSemProgress(null);
        }
      } else {
        setPrevSemProgress(null);
        setPrevSemLabel('');
      }

      // 2. Load Activities
      const storedActs = localStorage.getItem('mock_activities');
      const loadedActs: Activity[] = storedActs ? JSON.parse(storedActs) : [];
      setActivities(loadedActs.filter((a: any) => a.grade === activeGrade && a.semester === activeSemester).slice(-3));

      // 3. Load Materials
      const storedMats = localStorage.getItem('mock_reference_materials');
      const loadedMats: Material[] = storedMats ? JSON.parse(storedMats) : [];
      setMaterials(loadedMats.filter((m: any) => m.grade === activeGrade && m.semester === activeSemester).slice(-3));

      // 4. Load Target Univ Analysis (most recent)
      const storedUniv = localStorage.getItem('mock_target_universities');
      const loadedUniv: UnivAnalysis[] = storedUniv ? JSON.parse(storedUniv) : [];
      if (loadedUniv.length > 0) {
        setRecentAnalysis(loadedUniv[loadedUniv.length - 1]);
      } else {
        setRecentAnalysis(null);
      }

      if (profile) {
        setCareerInput(profile.career_wish || '');
        setMemoInput(profile.memo || '');
      }
      return;
    }

    try {
      // Fetch DB data
      const { data: g } = await supabase.from('goal_checkpoints').select('*').eq('student_id', user?.id).eq('grade', activeGrade).eq('semester', activeSemester);
      setGoals(g || []);

      // Calculate previous semester progress from DB
      if (prevG >= 1) {
        const { data: pg } = await supabase
          .from('goal_checkpoints')
          .select('*')
          .eq('student_id', user?.id)
          .eq('grade', prevG)
          .eq('semester', prevS);
        
        setPrevSemLabel(`${prevG}학년 ${prevS}학기`);
        if (pg && pg.length > 0) {
          const done = pg.filter((go) => go.status === '달성').length;
          setPrevSemProgress(Math.round((done / pg.length) * 100));
        } else {
          setPrevSemProgress(null);
        }
      } else {
        setPrevSemProgress(null);
        setPrevSemLabel('');
      }

      const { data: a } = await supabase.from('activities').select('*').eq('student_id', user?.id).eq('grade', activeGrade).eq('semester', activeSemester).order('created_at', { ascending: false }).limit(3);
      setActivities(a || []);

      const { data: m } = await supabase.from('reference_materials').select('*').eq('student_id', user?.id).eq('grade', activeGrade).eq('semester', activeSemester).order('created_at', { ascending: false }).limit(3);
      setMaterials(m || []);

      const { data: u } = await supabase.from('target_universities').select('*').eq('student_id', user?.id).order('analyzed_at', { ascending: false }).limit(1);
      if (u && u.length > 0) {
        setRecentAnalysis(u[0] as any);
      } else {
        setRecentAnalysis(null);
      }

      if (profile) {
        setCareerInput(profile.career_wish || '');
        setMemoInput(profile.memo || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (profile?.is_admin) {
      fetchPendingUsers();
    }
  }, [user, activeGrade, activeSemester, profile?.career_wish, profile?.is_admin]);

  // Sync profile fields on profile load
  useEffect(() => {
    if (profile) {
      setCareerInput(profile.career_wish || '');
      setMemoInput(profile.memo || '');
    }
  }, [profile]);

  // --- 희망 진로 / 특이사항 메모 인라인 수정 ---
  const handleSaveProfileFields = async (field: 'career' | 'memo') => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    const updatePayload = field === 'career' 
      ? { career_wish: careerInput }
      : { memo: memoInput };

    if (isMock) {
      const stored = localStorage.getItem('mock_student_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...parsed, ...updatePayload };
        localStorage.setItem('mock_student_profile', JSON.stringify(merged));
      }
      if (field === 'career') setIsEditingCareer(false);
      if (field === 'memo') setIsEditingMemo(false);
      refreshProfile();
      return;
    }

    try {
      const { error } = await supabase
        .from('student_profile')
        .update(updatePayload)
        .eq('id', user?.id);
        
      if (error) throw error;
      
      if (field === 'career') setIsEditingCareer(false);
      if (field === 'memo') setIsEditingMemo(false);
      refreshProfile();
    } catch (err) {
      alert('프로필 갱신에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 학년별 동적 수능 D-Day 계산 ---
  const getDDay = () => {
    // If student is grade 1, graduation year will be 2029.
    // If grade 2, graduation 2028.
    // If grade 3, graduation 2027.
    // Let's compute graduation year based on activeGrade.
    // CSAT (수능) is usually mid-November (around Nov 15th) of the year preceding graduation (or graduation year itself, which is targetCsatYear since graduation is Feb)
    // Actually, CSAT for activeGrade 3 is in Nov 2026.
    // CSAT for activeGrade 2 is in Nov 2027.
    // CSAT for activeGrade 1 is in Nov 2028.
    // So target CSAT Year = 2026 + (3 - activeGrade)
    const targetCsatYear = 2026 + (3 - activeGrade);
    const csatDate = new Date(targetCsatYear, 10, 12); // Approximate Nov 12th of that year

    const diffMs = csatDate.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: Math.abs(diffDays), label: '종료' };
    }
    return { days: diffDays, label: `D-${diffDays}` };
  };

  const dday = getDDay();

  // --- 목표 달성 현황 집계 ---
  const totalGoalsCount = goals.length;
  const completedGoalsCount = goals.filter((g) => g.status === '달성').length;
  const goalRate = totalGoalsCount > 0 ? Math.round((completedGoalsCount / totalGoalsCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* 학년/학기 전환 안내 웰컴 배너 */}
      {showTransitionBanner && (
        <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-brand-900/10 relative overflow-hidden animate-in slide-in-from-top duration-300">
          {/* Decorative circles */}
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={() => setShowTransitionBanner(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-300" />
                새 시즌 전환 알림
              </span>
              <h3 className="text-base md:text-lg font-black tracking-tight leading-snug">
                새 학년·학기가 시작되었습니다! 🚀
              </h3>
              <p className="text-xs text-white/90 leading-relaxed font-semibold">
                {prevSemProgress !== null ? (
                  <>
                    지난 <span className="underline decoration-wavy decoration-amber-400 font-extrabold">{prevSemLabel}</span> 목표 달성률은 <span className="bg-white/20 px-2 py-0.5 rounded-lg text-amber-300 font-black">{prevSemProgress}%</span>였습니다. 새로운 환경에서 다시 한번 한계를 뛰어넘어 보세요!
                  </>
                ) : (
                  <>
                    꿈을 향한 새로운 고등학교 학년 설계의 첫걸음입니다. 이번 학기의 달성 로드맵 목표를 수립하고 성장에 시동을 걸어보세요!
                  </>
                )}
              </p>
            </div>

            <Link
              to="/goals"
              className="bg-white hover:bg-slate-50 text-brand-700 font-black text-xs py-3 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-1 w-fit whitespace-nowrap self-start md:self-center"
            >
              <span>이번 학기 목표 설정</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
      
      {/* Top Banner: Profile Card & D-Day */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Student Profile Info (3 Columns) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          
          <div className="flex items-center gap-4.5 z-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-900/10">
              <UserIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-slate-800">{profile?.name || '학생'}</h3>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200/50">
                  고교 {activeGrade}학년 {activeSemester}학기 재학 중
                </span>
              </div>
              
              {/* Inline Career Wish Edit */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">희망 진로</span>
                {isEditingCareer ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={careerInput}
                      onChange={(e) => setCareerInput(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none"
                    />
                    <button onClick={() => handleSaveProfileFields('career')} className="p-1 hover:bg-slate-100 rounded text-brand-600"><Check className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-slate-600">{profile?.career_wish || '희망 진로를 기입하십시오.'}</p>
                    <button onClick={() => setIsEditingCareer(true)} className="p-1 text-slate-300 hover:text-slate-500 transition-colors"><Edit2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student Memo / Note inline edit */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 z-10">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1">
              <span>기타 특이사항 및 메모</span>
              {!isEditingMemo && (
                <button onClick={() => setIsEditingMemo(true)} className="text-slate-300 hover:text-slate-500"><Edit2 className="w-2.5 h-2.5" /></button>
              )}
            </div>
            {isEditingMemo ? (
              <div className="flex items-center gap-1.5">
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-medium focus:outline-none h-12"
                />
                <button onClick={() => handleSaveProfileFields('memo')} className="p-1 hover:bg-slate-100 rounded text-brand-600"><Check className="w-4 h-4" /></button>
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                {profile?.memo ? `"${profile.memo}"` : '학습 습관, 극복 사유 등의 특이사항을 이곳에 기록하세요.'}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Graduation/CSAT D-Day Card */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-950/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,#1e1b4b_0%,transparent_80%)]" />
          <div className="z-10 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>목표 학년 수능 시험일 기준</span>
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="z-10 mt-4">
            <h2 className="text-4xl font-black tracking-tight text-white">{dday.label}</h2>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              {activeGrade}학년 대입 관문 수능 예정일까지 남은 날짜
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Target Univ & Goal Checkpoints */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Widget 1: Target University Info */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-56">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4.5 h-4.5 text-brand-600" />
                  목표 대학 최근 분석 매칭 스태이터스
                </h4>
                <Link to="/university" className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-0.5">
                  진학분석 바로가기
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {recentAnalysis ? (
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <h5 className="font-extrabold text-base text-slate-800">
                      {recentAnalysis.university_name}
                    </h5>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      희망학과: {recentAnalysis.department_name}
                    </p>
                  </div>
                  <div className="bg-brand-50 border border-brand-100 rounded-2xl p-3.5 text-center">
                    <p className="text-[9px] font-bold text-brand-500 uppercase tracking-wider">매칭도</p>
                    <p className="text-2xl font-black text-brand-700">{recentAnalysis.ai_analysis_result.match_score}점</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs font-semibold">진행된 대학 분석 기록이 없습니다.</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">대학/학과 분석 탭에서 첫 대입 평가를 수행하십시오.</p>
                </div>
              )}
            </div>

            {recentAnalysis && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>최신 분석이 저장되었습니다. 지난 분석 대비 성장 곡선을 확인해보세요.</span>
              </div>
            )}
          </div>

          {/* Widget 2: Goal Checklist Process */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm min-h-64 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-4.5 h-4.5 text-brand-600" />
                  이번 학기 목표 수행 진척도
                </h4>
                <Link to="/goals" className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-0.5">
                  목표관리 바로가기
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {totalGoalsCount === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-xs font-semibold">이번 학기에 등록된 목표가 없습니다.</p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-8">
                  {/* Gauge bar */}
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold text-slate-600">
                      수행 목표 {totalGoalsCount}개 중 {completedGoalsCount}개 완료
                    </p>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className="h-full bg-brand-600 rounded-full transition-all duration-500"
                        style={{ width: `${goalRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Circular Rate Card */}
                  <div className="w-18 h-18 rounded-full border-4 border-brand-50 bg-brand-50/10 flex flex-col items-center justify-center shadow-inner">
                    <span className="text-xs font-bold text-brand-500">달성률</span>
                    <span className="text-lg font-black text-brand-700">{goalRate}%</span>
                  </div>
                </div>
              )}
            </div>

            {totalGoalsCount > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-2 max-h-36 overflow-y-auto">
                {goals.slice(0, 2).map(g => (
                  <div key={g.id} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                    <span className={`w-2 h-2 rounded-full ${g.status === '달성' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <p className="truncate flex-1">{g.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Recent Activities Feed & Reference Materials 아카이브 */}
        <div className="space-y-8">
          
          {/* Widget 3: Recent Activities Feed */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-64">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-brand-600" />
                  최근 기록 활동
                </h4>
                <Link to="/activities" className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-0.5">
                  활동관리 가기
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-xs font-semibold">이번 학기 등록된 활동이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activities.map((a) => (
                    <div key={a.id} className="group cursor-pointer">
                      <span className="text-[9px] font-bold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                        {a.activity_type}
                      </span>
                      <p className="text-xs font-bold text-slate-700 truncate mt-1 group-hover:text-brand-600 transition-colors">
                        {a.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Widget 4: Recent Reference Materials Archive */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-64">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FolderOpen className="w-4.5 h-4.5 text-brand-600" />
                  최근 아카이빙 자료
                </h4>
                <Link to="/library" className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-0.5">
                  자료실 가기
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-xs font-semibold">이번 학기 수집된 자료가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {materials.map((m) => (
                    <div key={m.id} className="group cursor-pointer">
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {m.material_type.toUpperCase()}
                      </span>
                      <p className="text-xs font-bold text-slate-700 truncate mt-1 group-hover:text-brand-600 transition-colors">
                        {m.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 관리자 가입 승인 패널 */}
      {profile?.is_admin && (
        <div className="mt-8 bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-brand-400" />
                  가입 승인 대기 회원 관리 (관리자 전용)
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  현재 회원 가입을 신청한 학생의 프로필을 검토하고 승인 여부를 결정합니다.
                </p>
              </div>
              <span className="bg-brand-500/10 text-brand-400 px-3 py-1 rounded-xl text-[10px] font-black border border-brand-500/20">
                대기: {pendingUsers.length}명
              </span>
            </div>

            {pendingUsers.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                현재 승인 대기 중인 회원 가입 신청이 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500">
                      <th className="pb-2.5">이름</th>
                      <th className="pb-2.5">이메일</th>
                      <th className="pb-2.5 text-center">기본 학년</th>
                      <th className="pb-2.5 text-right">관리 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-extrabold text-white">{u.name}</td>
                        <td className="py-3 text-slate-400">{u.email || '이메일 정보 없음'}</td>
                        <td className="py-3 text-center">{u.current_grade || u.grade || '-'}학년</td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleApproveUser(u.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black transition-all shadow"
                          >
                            승인하기
                          </button>
                          <button
                            onClick={() => handleRejectUser(u.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all"
                          >
                            거절/삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
