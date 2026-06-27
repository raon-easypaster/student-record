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

export const Growth: React.FC = () => {
  const { user } = useActiveSemester();
  const [academicList, setAcademicList] = useState<AcademicRecord[]>([]);
  const [mockList, setMockList] = useState<MockRecord[]>([]);
  const [activityList, setActivityList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

    return semKeys.map((k) => {
      const semActs = academicList.filter(
        (a) => a.grade === k.grade && a.semester === k.semester && a.rank_rating !== null
      );
      if (semActs.length === 0) {
        return { name: k.label, GPA: null };
      }
      const totalCredits = semActs.reduce((sum, a) => sum + a.credit_units, 0);
      const weightedSum = semActs.reduce((sum, a) => sum + (a.rank_rating! * a.credit_units), 0);
      return {
        name: k.label,
        GPA: Number((weightedSum / totalCredits).toFixed(2))
      };
    }).filter(d => d.GPA !== null); // Only show semesters with data
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
      const [g, s] = d.name.split('-').map(Number);
      timelineEvents.push({
        id: `gpa-${d.name}`,
        grade: g,
        semester: s,
        type: 'gpa',
        title: `내신 종합 평점 달성`,
        description: `학기말 이수단위 가중 평균 성적 ${d.GPA}등급 확정`
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
                      dataKey="GPA"
                      name="종합 평점"
                      stroke="#0284c7"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
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
        </>
      )}
    </div>
  );
};
