import React, { useState, useEffect } from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import { Plus, Trash2, CheckCircle, XCircle, Clock, Save, BarChart2 } from 'lucide-react';

interface GoalCheckpoint {
  id: string;
  grade: number;
  semester: number;
  content: string;
  target_date: string | null;
  status: '진행중' | '달성' | '미달성';
  reflection: string | null;
}

export const Goals: React.FC = () => {
  const { activeGrade, activeSemester, user } = useActiveSemester();
  const [goals, setGoals] = useState<GoalCheckpoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // --- Form States ---
  const [newContent, setNewContent] = useState<string>('');
  const [newTargetDate, setNewTargetDate] = useState<string>(
    new Date(new Date().getFullYear(), activeSemester === 1 ? 6 : 11, 31).toISOString().split('T')[0] // default to end of semester
  );

  // --- Editing Reflection states ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingReflection, setEditingReflection] = useState<string>('');

  const fetchGoals = async () => {
    setLoading(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const stored = localStorage.getItem('mock_goal_checkpoints');
      if (stored) {
        setGoals(JSON.parse(stored));
      } else {
        const dummy: GoalCheckpoint[] = [
          { id: '1', grade: 1, semester: 1, content: '수학Ⅰ 기말고사 1등급 확보하기', target_date: '2024-07-10', status: '달성', reflection: '중간고사 때 2등급이었으나 기말고사 100점을 맞아 수행평가 합산 최종 1등급을 이뤄냄.' },
          { id: '2', grade: 1, semester: 1, content: '컴퓨터 동아리에서 Python 알고리즘 시각화 툴 직접 완성해보기', target_date: '2024-06-30', status: '달성', reflection: 'Pygame 시각화 프로젝트를 직접 코딩하여 배포에 성공하고 부원들 앞에서 시연함.' },
          { id: '3', grade: 1, semester: 1, content: '전공 연계 도서 최소 3권 이상 읽고 독서록 제출하기', target_date: '2024-07-15', status: '미달성', reflection: '학업 스케줄이 밀려 2권만 제출함. 방학 때 보완할 예정.' },
          { id: '4', grade: 1, semester: 2, content: '통합과학 물리 및 화학 단원 1등급 도약', target_date: '2024-12-15', status: '달성', reflection: '물리 1등급, 화학 2등급으로 다소 아쉽지만 성취율 높음.' },
          { id: '5', grade: 2, semester: 1, content: '물리학Ⅰ 세특 발표 주제로 빛의 굴절 시뮬레이션 활용', target_date: '2025-06-20', status: '진행중', reflection: '' }
        ];
        localStorage.setItem('mock_goal_checkpoints', JSON.stringify(dummy));
        setGoals(dummy);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('goal_checkpoints')
        .select('*')
        .eq('student_id', user?.id);
      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  // --- 목표 추가 ---
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent) return;

    const newGoal = {
      grade: activeGrade,
      semester: activeSemester,
      content: newContent,
      target_date: newTargetDate || null,
      status: '진행중' as const,
      reflection: ''
    };

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = [...goals, { ...newGoal, id: 'goal-' + Date.now() }];
      localStorage.setItem('mock_goal_checkpoints', JSON.stringify(updated));
      setGoals(updated);
      setNewContent('');
      return;
    }

    try {
      const { error } = await supabase
        .from('goal_checkpoints')
        .insert([{ ...newGoal, student_id: user?.id }]);
      if (error) throw error;
      fetchGoals();
      setNewContent('');
    } catch (err) {
      alert('목표 등록에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 상태 업데이트 ---
  const handleStatusChange = async (id: string, status: GoalCheckpoint['status']) => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = goals.map(g => g.id === id ? { ...g, status } : g);
      localStorage.setItem('mock_goal_checkpoints', JSON.stringify(updated));
      setGoals(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('goal_checkpoints')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  // --- 회고 업데이트 ---
  const handleSaveReflection = async (id: string) => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = goals.map(g => g.id === id ? { ...g, reflection: editingReflection } : g);
      localStorage.setItem('mock_goal_checkpoints', JSON.stringify(updated));
      setGoals(updated);
      setEditingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('goal_checkpoints')
        .update({ reflection: editingReflection })
        .eq('id', id);
      if (error) throw error;
      fetchGoals();
      setEditingId(null);
    } catch (err) {
      alert('회고 저장에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 목표 삭제 ---
  const handleDeleteGoal = async (id: string) => {
    if (!confirm('정말 이 목표를 삭제하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = goals.filter(g => g.id !== id);
      localStorage.setItem('mock_goal_checkpoints', JSON.stringify(updated));
      setGoals(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('goal_checkpoints')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchGoals();
    } catch (err) {
      console.error(err);
    }
  };

  // --- 달성률 계산 헬퍼 ---
  const getSemesterProgress = (g: number, s: number) => {
    const semGoals = goals.filter(go => go.grade === g && go.semester === s);
    if (semGoals.length === 0) return null;
    const completed = semGoals.filter(go => go.status === '달성').length;
    return Math.round((completed / semGoals.length) * 100);
  };

  // 현재 활성화된 학기 목표
  const activeSemesterGoals = goals.filter(g => g.grade === activeGrade && g.semester === activeSemester);

  const semesters = [
    { g: 1, s: 1, label: '1학년 1학기' },
    { g: 1, s: 2, label: '1학년 2학기' },
    { g: 2, s: 1, label: '2학년 1학기' },
    { g: 2, s: 2, label: '2학년 2학기' },
    { g: 3, s: 1, label: '3학년 1학기' },
    { g: 3, s: 2, label: '3학년 2학기' }
  ];

  return (
    <div className="space-y-8">
      {/* 3개년 학기별 달성률 통계 대시보드 */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart2 className="w-4.5 h-4.5 text-brand-600" />
          학년별 목표 달성 현황 요약
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesters.map((sem) => {
            const pct = getSemesterProgress(sem.g, sem.s);
            const isCurrent = activeGrade === sem.g && activeSemester === sem.s;
            return (
              <div
                key={`${sem.g}-${sem.s}`}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-brand-50/20 border-brand-200 ring-2 ring-brand-100'
                    : 'bg-slate-50/40 border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className={isCurrent ? 'text-brand-700' : 'text-slate-600'}>{sem.label}</span>
                  <span className="text-slate-400">
                    {pct !== null ? `${pct}%` : '계획 없음'}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCurrent ? 'bg-brand-500' : 'bg-slate-400'
                    }`}
                    style={{ width: pct !== null ? `${pct}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 새 목표 추가 폼 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-fit">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-600" />
            목표 세우기 ({activeGrade}학년 {activeSemester}학기)
          </h4>

          <form onSubmit={handleAddGoal} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">목표 달성 기한</label>
              <input
                type="date"
                required
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">실천 행동 목표 (무엇을 완료할지)</label>
              <textarea
                required
                placeholder="예: 독서동아리 발표 자료 만들기, 교과 기말 내신 2등급 달성 등 구체적인 타겟 설정"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none h-28 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              학기 목표 등록
            </button>
          </form>
        </div>

        {/* 현재 학기 목표 리스트 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2 flex flex-col">
          <h4 className="text-sm font-bold text-slate-800 mb-4">
            이번 학기 목표 리스트 ({activeGrade}학년 {activeSemester}학기)
          </h4>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeSemesterGoals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 text-center">
              <Clock className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs font-medium">이번 학기에 설정한 목표가 아직 없습니다.</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">왼쪽의 계획 양식에서 새 행동 목표를 등록해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSemesterGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`border rounded-2xl p-5 shadow-inner transition-all ${
                    goal.status === '달성'
                      ? 'border-emerald-100 bg-emerald-50/5'
                      : goal.status === '미달성'
                      ? 'border-red-100 bg-red-50/5'
                      : 'border-slate-100 bg-slate-50/10'
                  }`}
                >
                  {/* Goal Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800 leading-snug">{goal.content}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">기한: {goal.target_date || '학기말'}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status selectors */}
                      <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50">
                        <button
                          onClick={() => handleStatusChange(goal.id, '진행중')}
                          className={`p-1 rounded-lg text-xs font-bold transition-all ${
                            goal.status === '진행중' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="진행중"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(goal.id, '달성')}
                          className={`p-1 rounded-lg text-xs font-bold transition-all ${
                            goal.status === '달성' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="달성 완료"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(goal.id, '미달성')}
                          className={`p-1 rounded-lg text-xs font-bold transition-all ${
                            goal.status === '미달성' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="미달성"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 hover:text-red-500 text-slate-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reflection Field */}
                  <div className="pt-3 border-t border-slate-100/50">
                    {editingId === goal.id ? (
                      <div className="space-y-2">
                        <textarea
                          placeholder="수행 과정에 대한 회고 및 교훈을 적어주세요."
                          value={editingReflection}
                          onChange={(e) => setEditingReflection(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-brand-500 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none h-16 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-slate-50"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleSaveReflection(goal.id)}
                            className="bg-brand-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-brand-500 flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            회고 저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-[11px] font-semibold text-slate-500 italic flex-1">
                          {goal.reflection
                            ? `회고: ${goal.reflection}`
                            : '아직 등록된 성찰 회고록이 없습니다.'}
                        </p>
                        <button
                          onClick={() => {
                            setEditingId(goal.id);
                            setEditingReflection(goal.reflection || '');
                          }}
                          className="text-[10px] font-bold text-brand-600 hover:underline flex-shrink-0"
                        >
                          {goal.reflection ? '수정' : '회고 쓰기'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
