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
  X,
  Plus,
  Share2,
  Globe
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

interface Schedule {
  id: string;
  title: string;
  schedule_date: string;
  category: '수행평가' | '세특보고서' | '모의고사' | '기타';
  notes?: string;
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

  // --- Schedule Calendar states ---
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  
  // Schedule Form states
  const [schTitle, setSchTitle] = useState<string>('');
  const [schDate, setSchDate] = useState<string>('');
  const [schCategory, setSchCategory] = useState<Schedule['category']>('수행평가');
  const [schNotes, setSchNotes] = useState<string>('');
  
  // Calendar current view Month
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());

  // Transition Season states
  const [prevSemProgress, setPrevSemProgress] = useState<number | null>(null);
  const [prevSemLabel, setPrevSemLabel] = useState<string>('');
  const [showTransitionBanner, setShowTransitionBanner] = useState<boolean>(true); // Defaults to true for review, can be toggled by date

  // Editing profile fields
  const [isEditingCareer, setIsEditingCareer] = useState<boolean>(false);
  const [careerInput, setCareerInput] = useState<string>('');
  const [isEditingMemo, setIsEditingMemo] = useState<boolean>(false);
  const [memoInput, setMemoInput] = useState<string>('');

  // --- Anonymized Portfolio Sharing states ---
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareDuration, setShareDuration] = useState<number>(7);
  const [activeShareLink, setActiveShareLink] = useState<any>(null);
  const [generatingShare, setGeneratingShare] = useState<boolean>(false);

  const fetchActiveShareLink = async () => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    try {
      if (isMock) {
        const stored = localStorage.getItem('mock_shared_links');
        const list = stored ? JSON.parse(stored) : [];
        const matched = list.find((l: any) => l.student_id === (user?.id || 'mock-id') && l.is_active && new Date(l.expires_at) > new Date());
        setActiveShareLink(matched || null);
      } else {
        const { data, error } = await supabase
          .from('shared_links')
          .select('*')
          .eq('student_id', user?.id)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          setActiveShareLink(data[0]);
        } else {
          setActiveShareLink(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateShareLink = async () => {
    setGeneratingShare(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + shareDuration);

    try {
      const tokenUuid = 'share-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);

      if (isMock) {
        const stored = localStorage.getItem('mock_shared_links');
        let list = stored ? JSON.parse(stored) : [];
        list = list.map((l: any) => l.student_id === (user?.id || 'mock-id') ? { ...l, is_active: false } : l);

        const newLink = {
          id: tokenUuid,
          student_id: user?.id || 'mock-id',
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_at: new Date().toISOString()
        };
        list.push(newLink);
        localStorage.setItem('mock_shared_links', JSON.stringify(list));
        setActiveShareLink(newLink);
      } else {
        await supabase
          .from('shared_links')
          .update({ is_active: false })
          .eq('student_id', user?.id);

        const { data, error } = await supabase
          .from('shared_links')
          .insert({
            student_id: user?.id,
            expires_at: expiresAt.toISOString(),
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        setActiveShareLink(data);
      }
      alert('상담용 안심 공유 링크가 정상 생성되었습니다!');
    } catch (err) {
      console.error(err);
      alert('공유 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!confirm('현재 공유 중인 링크를 즉시 폐쇄(만료)하시겠습니까? 더 이상 상담용으로 열람할 수 없게 됩니다.')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    try {
      if (isMock) {
        const stored = localStorage.getItem('mock_shared_links');
        let list = stored ? JSON.parse(stored) : [];
        list = list.map((l: any) => l.id === activeShareLink?.id ? { ...l, is_active: false } : l);
        localStorage.setItem('mock_shared_links', JSON.stringify(list));
      } else {
        const { error } = await supabase
          .from('shared_links')
          .update({ is_active: false })
          .eq('id', activeShareLink?.id);
        if (error) throw error;
      }
      setActiveShareLink(null);
      alert('공유 링크가 즉시 해제 및 폐쇄되었습니다.');
    } catch (err) {
      console.error(err);
      alert('공유 링크 차단 과정에서 오류가 발생했습니다.');
    }
  };

  // --- Admin Members Approval states ---
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  const fetchPendingUsers = async () => {
    // 항상 Supabase에서 먼저 조회 (관리자가 mock 우회 로그인이어도 실제 DB 데이터를 읽어야 함)
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('student_profile')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (!supabaseError && supabaseData !== null) {
      // Supabase에서 정상 조회된 경우
      const localUsers = localStorage.getItem('mock_users');
      const mockPending = localUsers
        ? JSON.parse(localUsers).filter((u: any) => !u.is_approved)
        : [];
      // Supabase 데이터 + localStorage 데이터 합산 (중복 제거)
      const combined = [...supabaseData];
      mockPending.forEach((mu: any) => {
        if (!combined.find((su: any) => su.email === mu.email)) {
          combined.push(mu);
        }
      });
      setPendingUsers(combined);
    } else {
      // Supabase 조회 실패 시 localStorage fallback
      const storedUsers = localStorage.getItem('mock_users');
      const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];
      setPendingUsers(mockUsers.filter((u: any) => !u.is_approved));
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      // Supabase 승인 시도 (항상 우선)
      const { error } = await supabase
        .from('student_profile')
        .update({ is_approved: true })
        .eq('id', userId);

      if (error) {
        // Supabase 실패 시 localStorage fallback
        const storedUsers = localStorage.getItem('mock_users');
        const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];
        const updated = mockUsers.map((u: any) => u.id === userId ? { ...u, is_approved: true } : u);
        localStorage.setItem('mock_users', JSON.stringify(updated));
      }
      alert('✅ 해당 학생의 가입 승인이 완료되었습니다! 이제 로그인이 가능합니다.');
      fetchPendingUsers();
    } catch (err) {
      console.error(err);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('정말 이 가입 신청을 거절하고 영구 삭제하시겠습니까?')) return;
    try {
      // Supabase에서 삭제 시도 (항상 우선)
      const { error } = await supabase
        .from('student_profile')
        .delete()
        .eq('id', userId);

      if (error) {
        // Supabase 실패 시 localStorage fallback
        const storedUsers = localStorage.getItem('mock_users');
        const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];
        const updated = mockUsers.filter((u: any) => u.id !== userId);
        localStorage.setItem('mock_users', JSON.stringify(updated));
      }
      alert('신청이 거절 및 파기되었습니다.');
      fetchPendingUsers();
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

      // 5. Load Schedules
      const storedSch = localStorage.getItem('mock_student_schedules');
      const loadedSch: Schedule[] = storedSch ? JSON.parse(storedSch) : [];
      setSchedules(loadedSch);

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

      const { data: sch } = await supabase.from('student_schedules').select('*').eq('student_id', user?.id);
      setSchedules(sch || []);

      if (profile) {
        setCareerInput(profile.career_wish || '');
        setMemoInput(profile.memo || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTitle || !schDate) {
      alert('일정 제목과 마감일을 반드시 입력해 주십시오.');
      return;
    }
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    const newSchedule = {
      title: schTitle,
      schedule_date: schDate,
      category: schCategory,
      notes: schNotes
    };

    try {
      if (isMock) {
        const stored = localStorage.getItem('mock_student_schedules');
        const list = stored ? JSON.parse(stored) : [];
        const created = { ...newSchedule, id: 'mock-sch-' + Date.now() };
        list.push(created);
        localStorage.setItem('mock_student_schedules', JSON.stringify(list));
        setSchedules(list);
      } else {
        const { error } = await supabase.from('student_schedules').insert([{ ...newSchedule, student_id: user?.id }]);
        if (error) throw error;
        const { data: sch } = await supabase.from('student_schedules').select('*').eq('student_id', user?.id);
        setSchedules(sch || []);
      }
      alert('일정이 성공적으로 등록되었습니다!');
      setIsScheduleModalOpen(false);
      setSchTitle('');
      setSchDate('');
      setSchCategory('수행평가');
      setSchNotes('');
    } catch (err) {
      console.error(err);
      alert('일정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSchedule = async (schId: string) => {
    if (!confirm('해당 일정을 삭제하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';
    try {
      if (isMock) {
        const stored = localStorage.getItem('mock_student_schedules');
        const list = stored ? JSON.parse(stored) : [];
        const updated = list.filter((s: any) => s.id !== schId);
        localStorage.setItem('mock_student_schedules', JSON.stringify(updated));
        setSchedules(updated);
      } else {
        const { error } = await supabase.from('student_schedules').delete().eq('id', schId);
        if (error) throw error;
        const { data: sch } = await supabase.from('student_schedules').select('*').eq('student_id', user?.id);
        setSchedules(sch || []);
      }
      alert('일정이 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      alert('일정 삭제 중 오류가 발생했습니다.');
    }
  };

  const getDDayAlerts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return schedules.map(s => {
      const targetDate = new Date(s.schedule_date);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...s, diffDays };
    }).filter(s => s.diffDays >= 0 && (s.diffDays === 0 || s.diffDays === 1 || s.diffDays === 3));
  };

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: (number | null)[] = [];
    const startDay = date.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push(i);
    }
    return days;
  };

  useEffect(() => {
    fetchDashboardData();
    fetchActiveShareLink();
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

      {/* 중요 일정 마감 임박 디데이 Alert 알림 */}
      {getDDayAlerts().length > 0 && (
        <div className="space-y-3">
          {getDDayAlerts().map((alertItem) => {
            const isCritical = alertItem.diffDays === 0 || alertItem.diffDays === 1;
            return (
              <div
                key={alertItem.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md ${
                  isCritical
                    ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                    isCritical ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {alertItem.diffDays === 0 ? 'D-Day' : `D-${alertItem.diffDays}`}
                  </div>
                  <div>
                    <p className="text-xs font-black">
                      [{alertItem.category}] {alertItem.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      마감 기한: {alertItem.schedule_date} {alertItem.notes ? `(${alertItem.notes})` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSchedule(alertItem.id)}
                  className="bg-white/60 hover:bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm transition-all"
                >
                  완료 처리
                </button>
              </div>
            );
          })}
        </div>
      )}
      
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

          {/* 안심 공유 링크 생성 패널 단추 */}
          <div className="flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 z-10 shrink-0">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow ${
                activeShareLink
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/10'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              {activeShareLink ? '포트폴리오 공유 중' : '외부 상담용 공유'}
            </button>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 text-center md:text-right">
              {activeShareLink ? '링크가 활성화되어 있습니다.' : '읽기전용 안심 링크 생성'}
            </p>
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

          {/* Widget: 중요 일정 캘린더 (수행평가/세특/모의고사) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                중요 일정 캘린더
              </h4>
              <button
                onClick={() => {
                  setSchDate('');
                  setIsScheduleModalOpen(true);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                일정 추가
              </button>
            </div>

            {/* 캘린더 달 조절 */}
            <div className="flex items-center justify-between text-xs font-black text-slate-700 bg-slate-50 px-3 py-2 rounded-xl">
              <button
                onClick={() => {
                  if (calMonth === 0) {
                    setCalYear(calYear - 1);
                    setCalMonth(11);
                  } else {
                    setCalMonth(calMonth - 1);
                  }
                }}
                className="hover:text-indigo-600 transition-colors p-1"
              >
                ◀
              </button>
              <span>{calYear}년 {calMonth + 1}월</span>
              <button
                onClick={() => {
                  if (calMonth === 11) {
                    setCalYear(calYear + 1);
                    setCalMonth(0);
                  } else {
                    setCalMonth(calMonth + 1);
                  }
                }}
                className="hover:text-indigo-600 transition-colors p-1"
              >
                ▶
              </button>
            </div>

            {/* 달력 판 그리드 */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-2">
              <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {getDaysInMonth(calYear, calMonth).map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-8" />;
                }

                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const daySchedules = schedules.filter(s => s.schedule_date === dateStr);

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => {
                      setSchDate(dateStr);
                      setIsScheduleModalOpen(true);
                    }}
                    className={`h-8 cursor-pointer rounded-xl flex flex-col items-center justify-center relative hover:bg-indigo-50/50 transition-all border ${
                      daySchedules.length > 0 
                        ? 'border-indigo-100 bg-indigo-50/20 font-extrabold text-indigo-700' 
                        : 'border-transparent text-slate-600 font-bold'
                    }`}
                  >
                    <span>{day}</span>
                    
                    {daySchedules.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {daySchedules.slice(0, 3).map((s) => {
                          const dotColor = 
                            s.category === '수행평가' ? 'bg-purple-500' :
                            s.category === '세특보고서' ? 'bg-cyan-500' :
                            s.category === '모의고사' ? 'bg-amber-500' : 'bg-slate-400';
                          return (
                            <span
                              key={s.id}
                              title={s.title}
                              className={`w-1 h-1 rounded-full ${dotColor}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 일정 리스트 목록 피드 */}
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-extrabold">이번 달 주요 등록 일정</p>
              {schedules.filter(s => {
                const sDate = new Date(s.schedule_date);
                return sDate.getFullYear() === calYear && sDate.getMonth() === calMonth;
              }).length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-2">등록된 일정이 없습니다.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {schedules.filter(s => {
                    const sDate = new Date(s.schedule_date);
                    return sDate.getFullYear() === calYear && sDate.getMonth() === calMonth;
                  }).map(s => {
                    const chipColor = 
                      s.category === '수행평가' ? 'bg-purple-500 text-white' :
                      s.category === '세특보고서' ? 'bg-cyan-500 text-white' :
                      s.category === '모의고사' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white';
                    return (
                      <div key={s.id} className="flex items-center justify-between text-[10px] p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${chipColor}`}>
                            {s.category}
                          </span>
                          <span className="font-extrabold text-slate-700 truncate max-w-[120px]" title={s.title}>
                            {s.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-semibold">{s.schedule_date.substring(5)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(s.id); }}
                            className="text-red-400 hover:text-red-600 transition-colors font-bold"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

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
      {/* 중요 일정 추가 모달 */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">🗓️ 새로운 중요 일정 추가</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold">일정 카테고리</label>
                <select
                  value={schCategory}
                  onChange={(e) => setSchCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-brand-500 font-bold"
                >
                  <option value="수행평가">수행평가 제출일</option>
                  <option value="세특보고서">세특 보고서 마감일</option>
                  <option value="모의고사">모의고사 일정</option>
                  <option value="기타">기타 일정</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold">일정 및 마감 제목</label>
                <input
                  type="text"
                  required
                  placeholder="예: 수학Ⅱ 극한 바이러스 모델링 제출"
                  value={schTitle}
                  onChange={(e) => setSchTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-brand-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold">마감일자 (날짜)</label>
                <input
                  type="date"
                  required
                  value={schDate}
                  onChange={(e) => setSchDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-brand-500 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold">상세 내용 및 메모 (선택)</label>
                <textarea
                  placeholder="추가 전달사항이나 준비물을 메모하십시오."
                  value={schNotes}
                  onChange={(e) => setSchNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-brand-500 min-h-20 resize-none font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-100 px-4 py-2.5 rounded-xl font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black shadow transition-all"
                >
                  일정 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 안심 포트폴리오 공유 링크 생성/관리 모달 */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Globe className="w-5 h-5 text-indigo-600 animate-spin" />
                상담용 안심 공유 링크 관리
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                주민번호, 학번, 이름 정보 등 민감한 개인식별정보가 **자동 암호 마스킹**된 읽기 전용 대시보드 링크를 생성합니다. 선생님 또는 상담 멘토에게 안전하게 공유할 수 있습니다.
              </p>

              {activeShareLink ? (
                <div className="space-y-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                    공유 링크 활성화 중
                  </span>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold">상담 웹 공유 URL (클릭하여 전체선택 복사)</label>
                    <input
                      type="text"
                      readOnly
                      onClick={(e) => (e.target as any).select()}
                      value={`${window.location.origin}/share/${activeShareLink.id}`}
                      className="w-full bg-white border border-emerald-200 p-2.5 rounded-xl outline-none text-emerald-800 font-bold select-all"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                    <span>만료 예정일: {new Date(activeShareLink.expires_at).toLocaleString()}</span>
                  </div>

                  <button
                    onClick={handleRevokeShareLink}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-black py-2.5 rounded-xl transition-all"
                  >
                    공유 링크 즉시 폐쇄 (열람 차단)
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-bold">공유 유효 기간 (만료 기간 설정)</label>
                    <select
                      value={shareDuration}
                      onChange={(e) => setShareDuration(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none focus:border-brand-500 font-bold"
                    >
                      <option value={1}>1일 간 유효 (단기 상담용)</option>
                      <option value={7}>7일 간 유효 (일주일 간 열람)</option>
                      <option value={30}>30일 간 유효 (장기 멘토링용)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCreateShareLink}
                    disabled={generatingShare}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-indigo-900/10 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    새로운 공유 링크 발급하기
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="border border-slate-200 hover:bg-slate-100 px-5 py-2 rounded-xl font-bold text-xs"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
