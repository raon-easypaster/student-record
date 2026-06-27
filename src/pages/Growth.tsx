import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Calendar, Award, Sparkles, TrendingDown, BookOpen } from 'lucide-react';

interface AcademicRecord {
  id: string;
  grade: number;
  semester: number;
  subject_name: string;
  rank_rating: number | null;
  credit_units: number;
}

interface MockRecord {
  id: string;
  grade: number;
  exam_name: string;
  exam_date: string;
  average_grade: number | null;
  results: Record<string, { grade: number | null; percentile: number | null }>;
}

interface Activity {
  id: string;
  grade: number;
  semester: number;
  activity_type: string;
  title: string;
  content: string;
  activity_date?: string | null;
}

interface SimulatedSubject {
  id: string;
  name: string;
  credit: number;
  grade: number;
}

export const Growth: React.FC = () => {
  const { user } = useActiveSemester();
  const [academicList, setAcademicList] = useState<AcademicRecord[]>([]);
  const [mockList, setMockList] = useState<MockRecord[]>([]);
  const [activityList, setActivityList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- Grade Simulator states ---
  const [simulatedList, setSimulatedList] = useState<SimulatedSubject[]>([
    { id: 's1', name: '가상 과목 A', credit: 4, grade: 1 },
    { id: 's2', name: '가상 과목 B', credit: 3, grade: 2 }
  ]);
  const [newSimName, setNewSimName] = useState<string>('');
  const [newSimCredit, setNewSimCredit] = useState<number>(3);
  const [newSimGrade, setNewSimGrade] = useState<number>(1);

  const handleAddSimSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimName.trim()) {
      alert('과목명을 입력해 주십시오.');
      return;
    }
    const newSub: SimulatedSubject = {
      id: 'sim-' + Date.now(),
      name: newSimName,
      credit: newSimCredit,
      grade: newSimGrade
    };
    setSimulatedList([...simulatedList, newSub]);
    setNewSimName('');
  };

  const handleRemoveSimSubject = (id: string) => {
    setSimulatedList(simulatedList.filter(s => s.id !== id));
  };

  const getActualAverage = () => {
    const graded = academicList.filter(r => r.rank_rating !== null && r.rank_rating > 0);
    if (graded.length === 0) return 0;
    const totalCredits = graded.reduce((sum, r) => sum + r.credit_units, 0);
    const totalScore = graded.reduce((sum, r) => sum + (r.rank_rating! * r.credit_units), 0);
    return Number((totalScore / totalCredits).toFixed(2));
  };

  const getSimulatedAverageVal = () => {
    const graded = academicList.filter(r => r.rank_rating !== null && r.rank_rating > 0);
    const actualCredits = graded.reduce((sum, r) => sum + r.credit_units, 0);
    const actualScore = graded.reduce((sum, r) => sum + (r.rank_rating! * r.credit_units), 0);

    const simCredits = simulatedList.reduce((sum, s) => sum + s.credit, 0);
    const simScore = simulatedList.reduce((sum, s) => sum + (s.grade * s.credit), 0);

    const totalCredits = actualCredits + simCredits;
    const totalScore = actualScore + simScore;

    if (totalCredits === 0) return 0;
    return Number((totalScore / totalCredits).toFixed(2));
  };

  const fetchAllData = async () => {
    setLoading(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      // Load Academic
      const storedAcad = localStorage.getItem('mock_academic_records');
      const acad: AcademicRecord[] = storedAcad ? JSON.parse(storedAcad) : [
        { id: '1', grade: 1, semester: 1, subject_name: '국어', rank_rating: 2, credit_units: 4 },
        { id: '2', grade: 1, semester: 1, subject_name: '수학Ⅰ', rank_rating: 1, credit_units: 4 },
        { id: '3', grade: 1, semester: 1, subject_name: '영어', rank_rating: 2, credit_units: 4 },
        { id: '4', grade: 1, semester: 1, subject_name: '통합과학', rank_rating: 1, credit_units: 3 },
        { id: '5', grade: 1, semester: 1, subject_name: '통합사회', rank_rating: 3, credit_units: 3 },
        
        { id: '6', grade: 1, semester: 2, subject_name: '국어', rank_rating: 1, credit_units: 4 },
        { id: '7', grade: 1, semester: 2, subject_name: '수학Ⅱ', rank_rating: 2, credit_units: 4 },
        { id: '8', grade: 1, semester: 2, subject_name: '영어', rank_rating: 1, credit_units: 4 },
        { id: '9', grade: 1, semester: 2, subject_name: '통합과학', rank_rating: 2, credit_units: 3 },
        { id: '10', grade: 1, semester: 2, subject_name: '통합사회', rank_rating: 2, credit_units: 3 },

        { id: '11', grade: 2, semester: 1, subject_name: '독서', rank_rating: 2, credit_units: 4 },
        { id: '12', grade: 2, semester: 1, subject_name: '수학Ⅰ', rank_rating: 1, credit_units: 4 },
        { id: '13', grade: 2, semester: 1, subject_name: '영어Ⅰ', rank_rating: 1, credit_units: 4 },
        { id: '14', grade: 2, semester: 1, subject_name: '물리학Ⅰ', rank_rating: 2, credit_units: 3 },
        { id: '15', grade: 2, semester: 1, subject_name: '화학Ⅰ', rank_rating: 3, credit_units: 3 }
      ];
      setAcademicList(acad);

      // Load Mock
      const storedMock = localStorage.getItem('mock_exam_records');
      const mocks: MockRecord[] = storedMock ? JSON.parse(storedMock) : [
        {
          id: 'm1',
          grade: 1,
          exam_date: '2024-03-20',
          exam_name: '3월 학평',
          average_grade: 1.8,
          results: { '국어': { grade: 2, percentile: 91 }, '수학': { grade: 1, percentile: 98 }, '영어': { grade: 2, percentile: null } }
        },
        {
          id: 'm2',
          grade: 1,
          exam_date: '2024-06-04',
          exam_name: '6월 학평',
          average_grade: 1.5,
          results: { '국어': { grade: 1, percentile: 97 }, '수학': { grade: 1, percentile: 98 }, '영어': { grade: 2, percentile: null } }
        },
        {
          id: 'm3',
          grade: 1,
          exam_date: '2024-09-04',
          exam_name: '9월 학평',
          average_grade: 1.4,
          results: { '국어': { grade: 1, percentile: 98 }, '수학': { grade: 2, percentile: 94 }, '영어': { grade: 1, percentile: null } }
        },
        {
          id: 'm4',
          grade: 2,
          exam_date: '2025-03-12',
          exam_name: '3월 학평',
          average_grade: 1.3,
          results: { '국어': { grade: 1, percentile: 97 }, '수학': { grade: 1, percentile: 99 }, '영어': { grade: 1, percentile: null } }
        }
      ];
      setMockList(mocks);

      // Load Activities
      const storedActs = localStorage.getItem('mock_activities');
      const acts: Activity[] = storedActs ? JSON.parse(storedActs) : [
        { id: 'a1', grade: 1, semester: 1, activity_type: '자율활동', title: '학급 자치회 환경 캠페인', content: '텀블러 사용 장려 카드뉴스 제작' },
        { id: 'a2', grade: 1, semester: 1, activity_type: '동아리활동', title: '알고리즘 탐구반 파이썬 구현', content: '이진 탐색 시각화 툴 개발' },
        { id: 'a3', grade: 1, semester: 2, activity_type: '동아리활동', title: '아두이노 스마트 홈 프로젝트', content: 'C언어와 하드웨어 제어 경험' },
        { id: 'a4', grade: 1, semester: 2, activity_type: '진로활동', title: '인공지능 진로 특강 청취 후 에세이 작성', content: '기계학습 모델의 작동 원리에 대한 고찰' },
        { id: 'a5', grade: 2, semester: 1, activity_type: '세부능력 및 특기사항', title: '물리학Ⅰ 세특 - 빛의 굴절 시뮬레이션', content: '굴절 법칙 시뮬레이터 파이썬 구현' }
      ];
      setActivityList(acts);

      setLoading(false);
      return;
    }

    try {
      const { data: acadData } = await supabase.from('academic_records').select('*').eq('student_id', user?.id);
      const { data: mockData } = await supabase.from('mock_exam_records').select('*').eq('student_id', user?.id);
      const { data: actData } = await supabase.from('activities').select('*').eq('student_id', user?.id);

      setAcademicList(acadData || []);
      setMockList(mockData || []);
      setActivityList(actData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // --- 내신 학기별 가중평균 등급 계산 ---
  const getSemesterGpaData = () => {
    const semKeys = [
      { grade: 1, semester: 1, label: '1-1' },
      { grade: 1, semester: 2, label: '1-2' },
      { grade: 2, semester: 1, label: '2-1' },
      { grade: 2, semester: 2, label: '2-2' },
      { grade: 3, semester: 1, label: '3-1' },
      { grade: 3, semester: 2, label: '3-2' }
    ];

    // 1. Calculate actual semester averages
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
    if (activeActual.length === 0) {
      return [];
    }

    // 2. Map actual cumulative GPA transitions
    const cumulativeData = activeActual.map((d, index) => {
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
        '실제 누적 내신': cumulativeGPA,
        '시뮬레이션 내신': cumulativeGPA
      };
    });

    // 3. Append forecasted semester
    const lastActive = activeActual[activeActual.length - 1];
    let nextGrade = lastActive.grade;
    let nextSemester = lastActive.semester + 1;
    if (nextSemester > 2) {
      nextGrade += 1;
      nextSemester = 1;
    }

    if (nextGrade <= 3 && simulatedList.length > 0) {
      const graded = academicList.filter(r => r.rank_rating !== null && r.rank_rating > 0);
      const actualCredits = graded.reduce((sum, r) => sum + r.credit_units, 0);
      const actualScore = graded.reduce((sum, r) => sum + (r.rank_rating! * r.credit_units), 0);

      const simCredits = simulatedList.reduce((sum, s) => sum + s.credit, 0);
      const simScore = simulatedList.reduce((sum, s) => sum + (s.grade * s.credit), 0);

      const totalCredits = actualCredits + simCredits;
      const totalScore = actualScore + simScore;
      const simCumulativeGPA = totalCredits > 0 ? Number((totalScore / totalCredits).toFixed(2)) : 0;

      cumulativeData.push({
        name: `${nextGrade}-${nextSemester} (예상)`,
        '실제 누적 내신': null as any,
        '시뮬레이션 내신': simCumulativeGPA
      });
    }

    return cumulativeData;
  };

  // --- 모의고사 추이 데이터 ---
  const getMockChartData = () => {
    return mockList
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .map((m) => {
        // Calculate average percentile
        const percentiles = Object.values(m.results)
          .map((r) => r.percentile)
          .filter((p): p is number => p !== null);
        const avgPercentile = percentiles.length > 0
          ? Number((percentiles.reduce((a, b) => a + b, 0) / percentiles.length).toFixed(1))
          : null;

        return {
          name: `${m.grade}학년 ${m.exam_name.replace('전국연합학력평가', '학평')}`,
          '평균등급': m.average_grade || null,
          '평균백분위': avgPercentile
        };
      });
  };

  // --- 생기부 누적 활동 통계 데이터 ---
  const getActivityChartData = () => {
    const semKeys = [
      { grade: 1, semester: 1, label: '1-1' },
      { grade: 1, semester: 2, label: '1-2' },
      { grade: 2, semester: 1, label: '2-1' },
      { grade: 2, semester: 2, label: '2-2' },
      { grade: 3, semester: 1, label: '3-1' },
      { grade: 3, semester: 2, label: '3-2' }
    ];

    const types = ['자율활동', '동아리활동', '진로활동', '세부능력 및 특기사항', '행동특성 및 종합의견'];

    return semKeys.map((sem) => {
      const semActs = activityList.filter((a) => a.grade === sem.grade && a.semester === sem.semester);
      const row: Record<string, any> = { name: sem.label };
      
      types.forEach((t) => {
        row[t] = semActs.filter((a) => a.activity_type === t).length;
      });

      return row;
    });
  };

  const gpaData = getSemesterGpaData();
  const mockChartData = getMockChartData();
  const activityChartData = getActivityChartData();

  // --- 연도별 전체 타임라인 뷰 가공 ---
  const getTimeline = () => {
    // Sort all activities + academic GPA summaries into an unified timeline list
    const timelineEvents: Array<{
      id: string;
      grade: number;
      semester: number;
      type: 'gpa' | 'activity' | 'mock';
      title: string;
      description: string;
      date?: string;
    }> = [];

    // Add GPA summaries
    gpaData.forEach((d) => {
      if (d['실제 누적 내신'] === null || d.name.includes('예상')) return;
      const [g, s] = d.name.split('-').map(Number);
      timelineEvents.push({
        id: `gpa-${d.name}`,
        grade: g,
        semester: s,
        type: 'gpa',
        title: `내신 종합 누적 평점 달성`,
        description: `해당 학기까지의 전체 누적 평균 내신 성적 ${d['실제 누적 내신']}등급 달성 및 확정`
      });
    });

    // Add Mock exams
    mockList.forEach((m) => {
      timelineEvents.push({
        id: m.id,
        grade: m.grade,
        semester: new Date(m.exam_date).getMonth() + 1 <= 8 ? 1 : 2, // Approximate semester based on month
        type: 'mock',
        title: `${m.exam_name} 응시`,
        description: `모의고사 종합 평균 등급 ${m.average_grade || '-'}등급 획득`,
        date: m.exam_date
      });
    });

    // Add Activities
    activityList.forEach((a) => {
      timelineEvents.push({
        id: a.id,
        grade: a.grade,
        semester: a.semester,
        type: 'activity',
        title: `[${a.activity_type}] ${a.title}`,
        description: a.content,
        date: a.activity_date || undefined
      });
    });

    // Sort timeline by grade ASC, semester ASC, and date/type
    return timelineEvents.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.type === 'gpa' ? 1 : -1; // Keep GPA summaries at the bottom of the semester
    });
  };

  const timelineEvents = getTimeline();

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium mt-3">추이 분석 그래프를 그리는 중...</p>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 내신 등급 추이 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                학기별 내신 등급 추이
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold mb-6">등급은 낮을수록(1등급에 가까울수록) 우수한 성적입니다.</p>
              
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gpaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                    <YAxis reversed domain={[9, 1]} ticks={[9, 8, 7, 6, 5, 4, 3, 2, 1]} stroke="#94a3b8" fontSize={11} fontWeight={600} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="실제 누적 내신"
                      name="실제 누적 내신"
                      stroke="#0284c7"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="시뮬레이션 내신"
                      name="시뮬레이션 반영 예측"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 모의고사 등급 추이 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-brand-500" />
                모의고사 평점 및 백분위 추이
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold mb-6">시행일 순서로 누적된 모의고사 등급(좌축) 및 백분위(우축) 추이</p>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight={600} />
                    <YAxis yAxisId="left" reversed domain={[9, 1]} stroke="#3b82f6" fontSize={10} fontWeight={600} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#f59e0b" fontSize={10} fontWeight={600} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="평균등급" stroke="#3b82f6" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="평균백분위" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 생기부 누적 활동 건수 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                학기별 생기부 활동 영역 밸런스
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold mb-6">창의적 체험활동 각 영역별 및 과목별 세특 활동 기록 건수 누적 추이</p>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    <Legend />
                    <Bar dataKey="자율활동" stackId="a" fill="#38bdf8" />
                    <Bar dataKey="동아리활동" stackId="a" fill="#34d399" />
                    <Bar dataKey="진로활동" stackId="a" fill="#fb7185" />
                    <Bar dataKey="세부능력 및 특기사항" stackId="a" fill="#a78bfa" />
                    <Bar dataKey="행동특성 및 종합의견" stackId="a" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              3개년 종합 통합 성장 타임라인
            </h4>

            {timelineEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-semibold">타임라인에 표현할 데이터(성적, 활동 등)가 충분하지 않습니다.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-200 ml-4 md:ml-32 pl-6 space-y-8">
                {timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative group">
                    {/* Time marker on the left for medium screens */}
                    <div className="hidden md:block absolute -left-38 top-1.5 text-right w-28 text-[11px] font-bold text-slate-400">
                      <span>{evt.date || `${evt.grade}학년 ${evt.semester}학기`}</span>
                    </div>

                    {/* Timeline Node dot */}
                    <span className={`absolute -left-9.5 top-2.5 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow ${
                      evt.type === 'gpa'
                        ? 'bg-emerald-500'
                        : evt.type === 'mock'
                        ? 'bg-blue-500'
                        : 'bg-brand-500'
                    }`}>
                      {evt.type === 'gpa' ? (
                        <Award className="w-3.5 h-3.5 text-white" />
                      ) : evt.type === 'mock' ? (
                        <TrendingDown className="w-3 h-3 text-white" />
                      ) : (
                        <Calendar className="w-3 h-3 text-white" />
                      )}
                    </span>

                    {/* Timeline Node Card */}
                    <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-colors max-w-4xl">
                      <span className="md:hidden block text-[10px] font-bold text-slate-400 mb-1">
                        {evt.date || `${evt.grade}학년 ${evt.semester}학기`}
                      </span>
                      <h5 className="font-extrabold text-xs text-slate-800">{evt.title}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1.5 whitespace-pre-wrap">
                        {evt.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 목표 성적 시뮬레이터 섹션 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 mt-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  목표 내신 성적 시뮬레이터 (Target Grade Simulator)
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  현재까지 등록된 내신 정보에 다음 학기 가상 과목 등급을 임의 입력하여 종합 누적 등급 평점 변화를 시뮬레이션하십시오.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* 좌측 1: 과목 추가 입력 폼 */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <p className="text-xs font-black text-slate-800">📋 다음 학기 가상 과목 등록</p>
                <form onSubmit={handleAddSimSubject} className="space-y-3.5 text-xs font-semibold text-slate-700">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold">가상 과목명</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 미적분, 물리Ⅱ 등"
                      value={newSimName}
                      onChange={(e) => setNewSimName(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold">이수 단위</label>
                      <select
                        value={newSimCredit}
                        onChange={(e) => setNewSimCredit(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold"
                      >
                        {[1, 2, 3, 4, 5].map(c => (
                          <option key={c} value={c}>{c}단위</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold">목표 등급</label>
                      <select
                        value={newSimGrade}
                        onChange={(e) => setNewSimGrade(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl outline-none focus:border-indigo-500 font-bold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => (
                          <option key={g} value={g}>{g}등급</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl shadow-md shadow-indigo-900/10 transition-all"
                  >
                    가상 과목 시뮬레이션 추가
                  </button>
                </form>
              </div>

              {/* 중앙 2: 추가된 과목 리스트 피드 */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-800">💡 시뮬레이션 반영 과목 리스트</p>
                  {simulatedList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-10">과목을 등록하여 변화를 예측해 보세요.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {simulatedList.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-black">
                              {s.credit}단위
                            </span>
                            <span className="font-extrabold text-slate-700">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-rose-600">{s.grade}등급</span>
                            <button
                              onClick={() => handleRemoveSimSubject(s.id)}
                              className="text-red-400 hover:text-red-600 font-bold transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-2.5">
                  ※ 시뮬레이션 과목은 우측의 누적 내신 및 그래프상 보라색 점선(예상 포인트)에 실시간 합성되어 연출됩니다.
                </p>
              </div>

              {/* 우측 3: 누적 내신 가치 요약 (실시간) */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-950 shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="inline-flex bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                    실시간 시뮬레이션 결과
                  </span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-300 font-bold">현재 실제 누적 내신</p>
                      <p className="text-2xl font-black text-slate-300">{getActualAverage() || '-'} 등급</p>
                    </div>
                    <div className="space-y-0.5 border-l border-white/10 pl-4">
                      <p className="text-[10px] text-indigo-300 font-bold">예상 시뮬레이션 누적</p>
                      <p className="text-2xl font-black text-indigo-400">{getSimulatedAverageVal() || '-'} 등급</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">내신 등급 변동량</span>
                  {getActualAverage() && getSimulatedAverageVal() ? (
                    (() => {
                      const diff = getActualAverage() - getSimulatedAverageVal();
                      if (diff > 0) {
                        return (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-black">
                            ▲ {diff.toFixed(2)} 등급 향상!
                          </span>
                        );
                      } else if (diff < 0) {
                        return (
                          <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-lg font-black">
                            ▼ {Math.abs(diff).toFixed(2)} 등급 하락
                          </span>
                        );
                      }
                      return (
                        <span className="bg-white/10 text-white px-2 py-0.5 rounded-lg font-black">
                          변동 없음
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-slate-400 italic">계산 대기 중</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
};
