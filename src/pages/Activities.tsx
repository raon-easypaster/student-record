import React, { useState, useEffect } from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import { Plus, Trash2, Calendar, BookOpen, Link, ToggleLeft, ToggleRight, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { OcrScannerModal } from '../components/OcrScannerModal';

interface Activity {
  id: string;
  grade: number;
  semester: number;
  activity_type: '자율활동' | '동아리활동' | '진로활동' | '세부능력 및 특기사항' | '행동특성 및 종합의견';
  title: string;
  activity_date: string | null;
  content: string;
  reflection: string | null;
  subject_name: string | null;
  career_relation: string | null;
  related_book?: string | null; // 2024 기재요령 대응: 교과/진로 탐구 내 독서 연계 기록용
}

interface ReferenceMaterial {
  id: string;
  title: string;
  material_type: 'file' | 'link' | 'youtube';
}

export const Activities: React.FC = () => {
  const { activeGrade, activeSemester, user } = useActiveSemester();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  
  // Connections: { [activityId]: [materialId1, materialId2] }
  const [connections, setConnections] = useState<Record<string, string[]>>({});
  
  const [viewMode, setViewMode] = useState<'grade' | 'type'>('type'); // 학년별 vs 유형별
  const [selectedTypeTab, setSelectedTypeTab] = useState<string>('자율활동');
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isOcrOpen, setIsOcrOpen] = useState<boolean>(false);

  // --- Form States ---
  const [formType, setFormType] = useState<Activity['activity_type']>('자율활동');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formContent, setFormContent] = useState<string>('');
  const [formReflection, setFormReflection] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formCareerRelation, setFormCareerRelation] = useState<string>('');
  const [formRelatedBook, setFormRelatedBook] = useState<string>(''); // 독서 연계 폼
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]); // linked material IDs

  const activityTypes: Activity['activity_type'][] = [
    '자율활동', '동아리활동', '진로활동', '세부능력 및 특기사항', '행동특성 및 종합의견'
  ];

  // --- 데이터 패칭 ---
  const fetchData = async () => {
    setLoading(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      // 1. Activities Load
      const storedActivities = localStorage.getItem('mock_activities');
      if (storedActivities) {
        setActivities(JSON.parse(storedActivities));
      } else {
        const dummyActivities: Activity[] = [
          {
            id: 'act-1',
            grade: 1,
            semester: 1,
            activity_type: '자율활동',
            title: '학급 자치회 환경 보호 캠페인 기획 및 주도',
            activity_date: '2024-04-12',
            content: '기후 위기 심각성에 관한 교내 카드뉴스를 제작하여 게시함. 1회용 컵 대신 텀블러 사용을 장려하기 위해 쿠폰 제도를 학급 내에 도입하고 20명의 참여를 유도함.',
            reflection: '작은 제도의 설계가 사람들의 환경 행동을 변화시키는 것을 보며, 시스템과 데이터 설계의 중요성을 깨닫는 계기가 됨.',
            subject_name: null,
            career_relation: 'IT 기술을 접목한 사회 문제 해결'
          },
          {
            id: 'act-2',
            grade: 1,
            semester: 1,
            activity_type: '동아리활동',
            title: '알고리즘 탐구반 - 이진 탐색 알고리즘 시각화 프로젝트',
            activity_date: '2024-05-18',
            content: '파이썬(Python)의 Pygame 라이브러리를 활용해 이진 탐색 알고리즘의 동작 과정을 시각적으로 보여주는 시뮬레이터를 개발함. 정렬된 배열 안에서 탐색 범위가 절반씩 줄어드는 과정을 그래프 형태로 구현.',
            reflection: '시간 복잡도 O(log N)의 효율성을 시각적으로 확인하며, 탐색 알고리즘 최적화 기법에 큰 흥미를 느낌.',
            subject_name: null,
            career_relation: '컴퓨터 소프트웨어 역량 강화'
          },
          {
            id: 'act-3',
            grade: 1,
            semester: 1,
            activity_type: '진로활동',
            title: '컴퓨터공학 진로 세션 탐구 보고서 제출',
            activity_date: '2024-06-15',
            content: '수학과 컴퓨터 공학의 연계성을 심층적으로 탐구함. 알고리즘 설계의 기본 논리를 조사하고 컴퓨터 공학자가 갖추어야 할 공학 기초 소양에 관해 탐구 보고서를 작성함.',
            reflection: '자료구조의 기본과 파이썬 코딩 기술이 단순 암기가 아닌 논리적 추론에 기반한다는 사실을 인지함.',
            subject_name: null,
            career_relation: '컴퓨터 공학 기초 소양',
            related_book: '수학으로 배우는 파이썬(저자: 우메자와 아리)' // 독서기록을 진로활동에 연계
          },
          {
            id: 'act-4',
            grade: 1,
            semester: 1,
            activity_type: '세부능력 및 특기사항',
            title: '수학Ⅰ - 수열의 합을 이용한 프로그램 실행시간 계산',
            activity_date: null,
            content: '수학Ⅰ 시간에 등차수열과 등비수열을 학습한 후, 알고리즘 루프문의 중첩 횟수에 따른 반복 연산 횟수를 수열의 합 공식을 대입하여 증명해냄. 이를 세특 발표회에서 급우들에게 발표함.',
            reflection: '수학 공식이 프로그램의 효율성을 판단하는 강력한 언어임을 알게 됨.',
            subject_name: '수학Ⅰ',
            career_relation: '이산수학과 프로그래밍 연계',
            related_book: '알고리즘 첫걸음(저자: 아디탸 바르가바)' // 독서기록을 세특에 연계
          }
        ];
        localStorage.setItem('mock_activities', JSON.stringify(dummyActivities));
        setActivities(dummyActivities);
      }

      // 2. Reference Materials Load
      const storedMaterials = localStorage.getItem('mock_reference_materials');
      if (storedMaterials) {
        setMaterials(JSON.parse(storedMaterials));
      } else {
        const dummyMats: ReferenceMaterial[] = [
          { id: 'mat-1', title: '서울대 컴퓨터공학과 권장 도서 리스트', material_type: 'link' },
          { id: 'mat-2', title: '이진 탐색 알고리즘 구현 코드 공유 포스트', material_type: 'file' },
          { id: 'mat-3', title: '기후 위기와 탄소 배출량 빅데이터 시각화 강의', material_type: 'youtube' }
        ];
        localStorage.setItem('mock_reference_materials', JSON.stringify(dummyMats));
        setMaterials(dummyMats);
      }

      // 3. Connections Load
      const storedConn = localStorage.getItem('mock_material_connections');
      if (storedConn) {
        setConnections(JSON.parse(storedConn));
      } else {
        const dummyConn = {
          'act-2': ['mat-2'],
          'act-1': ['mat-3'],
          'act-3': ['mat-1']
        };
        localStorage.setItem('mock_material_connections', JSON.stringify(dummyConn));
        setConnections(dummyConn);
      }

      setLoading(false);
      return;
    }

    try {
      // Supabase loading
      const { data: actData, error: actErr } = await supabase
        .from('activities')
        .select('*')
        .eq('student_id', user?.id);
      if (actErr) throw actErr;
      setActivities(actData || []);

      const { data: matData, error: matErr } = await supabase
        .from('reference_materials')
        .select('id, title, material_type')
        .eq('student_id', user?.id);
      if (matErr) throw matErr;
      setMaterials(matData || []);

      const { data: connData, error: connErr } = await supabase
        .from('material_connections')
        .select('material_id, connected_id')
        .eq('connected_type', 'activity');
      if (connErr) throw connErr;

      // Group connections by activity id
      const groupedConn: Record<string, string[]> = {};
      connData?.forEach((c) => {
        if (!groupedConn[c.connected_id]) {
          groupedConn[c.connected_id] = [];
        }
        groupedConn[c.connected_id].push(c.material_id);
      });
      setConnections(groupedConn);

    } catch (err) {
      console.error('Failed to fetch activities data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // --- 활동 추가 ---
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;

    const newActivity = {
      grade: activeGrade,
      semester: activeSemester,
      activity_type: formType,
      title: formTitle,
      activity_date: formDate || null,
      content: formContent,
      reflection: formReflection || null,
      subject_name: formType === '세부능력 및 특기사항' ? formSubject : null,
      career_relation: formCareerRelation || null,
      related_book: formRelatedBook || null
    };

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const actId = 'act-' + Date.now();
      const updatedActs = [...activities, { ...newActivity, id: actId }];
      localStorage.setItem('mock_activities', JSON.stringify(updatedActs));
      setActivities(updatedActs);

      // Save material connections
      if (selectedMaterials.length > 0) {
        const updatedConn = { ...connections, [actId]: selectedMaterials };
        localStorage.setItem('mock_material_connections', JSON.stringify(updatedConn));
        setConnections(updatedConn);
      }

      closeModal();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{ ...newActivity, student_id: user?.id }])
        .select('id')
        .single();
      if (error) throw error;

      // Insert material connections in Supabase
      if (selectedMaterials.length > 0 && data) {
        const insertRows = selectedMaterials.map((matId) => ({
          material_id: matId,
          connected_type: 'activity',
          connected_id: data.id
        }));
        const { error: connErr } = await supabase
          .from('material_connections')
          .insert(insertRows);
        if (connErr) throw connErr;
      }

      await fetchData();
      closeModal();
    } catch (err) {
      alert('활동 기록 저장에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 활동 삭제 ---
  const handleDeleteActivity = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updatedActs = activities.filter(a => a.id !== id);
      localStorage.setItem('mock_activities', JSON.stringify(updatedActs));
      setActivities(updatedActs);

      const updatedConn = { ...connections };
      delete updatedConn[id];
      localStorage.setItem('mock_material_connections', JSON.stringify(updatedConn));
      setConnections(updatedConn);
      return;
    }

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      alert('활동 기록 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormTitle('');
    setFormContent('');
    setFormReflection('');
    setFormSubject('');
    setFormCareerRelation('');
    setFormRelatedBook('');
    setSelectedMaterials([]);
  };

  // --- 뷰 필터링 및 렌더링용 연산 ---
  // 학년별/학기별로 정렬 및 그룹핑
  const renderGradeView = () => {
    const grades = [1, 2, 3];
    return grades.map((g) => {
      const gradeActs = activities.filter((a) => a.grade === g);
      if (gradeActs.length === 0) return null;

      return (
        <div key={g} className="space-y-4">
          <h4 className="text-base font-extrabold text-slate-800 border-l-4 border-brand-600 pl-3">
            {g}학년 누적 활동
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gradeActs.map((act) => renderActivityCard(act))}
          </div>
        </div>
      );
    });
  };

  const renderTypeView = () => {
    const typeActs = activities.filter((a) => a.activity_type === selectedTypeTab);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">
            {selectedTypeTab} 목록 (전체 학년)
          </h4>
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-xl">
            총 {typeActs.length}건
          </span>
        </div>

        {typeActs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-100 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium">이 카테고리에 등록된 활동이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {typeActs.map((act) => renderActivityCard(act))}
          </div>
        )}
      </div>
    );
  };

  const renderActivityCard = (act: Activity) => {
    const linkedMatIds = connections[act.id] || [];
    const linkedMats = materials.filter((m) => linkedMatIds.includes(m.id));

    return (
      <div key={act.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group">
        <div>
          {/* Card Header Info */}
          <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg">
                {act.grade}학년 {act.semester}학기
              </span>
              {act.subject_name && (
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                  {act.subject_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {act.activity_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {act.activity_date}
                </span>
              )}
              <button
                onClick={() => handleDeleteActivity(act.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h5 className="font-extrabold text-sm text-slate-800 leading-snug mb-3">
            {act.title}
          </h5>

          {/* Activity Content */}
          <div className="space-y-2.5 text-xs">
            <div>
              <p className="font-bold text-slate-400 text-[10px] mb-0.5">상세 활동 내용</p>
              <p className="text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 whitespace-pre-wrap">{act.content}</p>
            </div>

            {act.reflection && (
              <div>
                <p className="font-bold text-slate-400 text-[10px] mb-0.5">느낀점 및 성장 포인트</p>
                <p className="text-slate-600 font-medium leading-relaxed bg-brand-50/10 p-2.5 rounded-xl border border-brand-100/20 whitespace-pre-wrap italic">
                  &ldquo;{act.reflection}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Career Link & Connected Materials */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          {act.career_relation && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">진로연계</span>
              <p className="text-[10px] font-bold text-slate-500">{act.career_relation}</p>
            </div>
          )}

          {act.related_book && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">독서 연계</span>
              <p className="text-[10px] font-bold text-slate-500 italic">📖 {act.related_book}</p>
            </div>
          )}

          {linkedMats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                <Link className="w-2.5 h-2.5" />
                자료 연결:
              </span>
              {linkedMats.map((mat) => (
                <span
                  key={mat.id}
                  className="bg-slate-100 hover:bg-slate-200 transition-colors text-[9px] font-bold text-slate-500 px-2 py-0.5 rounded-full"
                >
                  {mat.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        
        {/* Toggle Mode */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500">모아보기 기준:</span>
          <button
            onClick={() => setViewMode(viewMode === 'grade' ? 'type' : 'grade')}
            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 transition-colors px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700"
          >
            {viewMode === 'type' ? (
              <>
                <ToggleRight className="w-5 h-5 text-brand-600" />
                <span>생기부 유형별</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-400" />
                <span>학년별 모아보기</span>
              </>
            )}
          </button>
        </div>

        {/* Add Buttons & Scanner */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOcrOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-900/10 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            AI 생기부/성적표 스캔
          </button>

          <button
            onClick={() => {
              setFormType(selectedTypeTab as any || '자율활동');
              setIsModalOpen(true);
            }}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" />
            활동 기록하기
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium mt-3">기록된 활동을 동기화 중...</p>
        </div>
      ) : viewMode === 'type' ? (
        <div className="space-y-6">
          {/* Tab Selection */}
          <div className="flex flex-wrap gap-2 pb-1.5 border-b border-slate-200">
            {activityTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTypeTab(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTypeTab === type
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {renderTypeView()}
        </div>
      ) : (
        <div className="space-y-12">
          {renderGradeView()}
        </div>
      )}

      {/* --- ADD ACTIVITY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              생기부 활동 등록 ({activeGrade}학년 {activeSemester}학기)
            </h4>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">생기부 항목 유형</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  >
                    {activityTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">활동 날짜 (세특/행특 제외 가능)</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {formType === '세부능력 및 특기사항' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">해당 교과목명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 수학Ⅰ, 물리학Ⅰ, 경제"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">활동 제목 / 핵심 탐구 명칭</label>
                <input
                  type="text"
                  required
                  placeholder="활동의 성격을 요약하는 간결한 문장"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">구체적인 활동 상세 내용 (300자 내외 권장)</label>
                <textarea
                  required
                  placeholder="무엇을 탐구하고 개발했는지 정량적이고 객관적인 사실 위주로 기재"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none h-28 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">느낀점 / 배운점 / 성장 변화 (선택 사항)</label>
                <textarea
                  placeholder="이 활동을 마친 후 느낀 학업적 성장 변화나 기술적 소회"
                  value={formReflection}
                  onChange={(e) => setFormReflection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">관련 교과 / 진로 연계 키워드</label>
                  <input
                    type="text"
                    placeholder="예: IT 융합, 인공지능"
                    value={formCareerRelation}
                    onChange={(e) => setFormCareerRelation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">연계 탐구 도서 (도서명 및 저자)</label>
                  <input
                    type="text"
                    placeholder="예: 알고리즘 첫걸음(아디탸 바르가바) - 독서 연계"
                    value={formRelatedBook}
                    onChange={(e) => setFormRelatedBook(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* 참고 자료 연동 체크박스 */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">관련 참고 자료실 연결</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-24 overflow-y-auto space-y-1.5">
                    {materials.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-bold p-1">자료실에 등록된 자료가 없습니다.</p>
                    ) : (
                      materials.map((mat) => (
                        <label key={mat.id} className="flex items-center gap-2 cursor-pointer p-0.5 hover:bg-slate-100 rounded">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(mat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterials([...selectedMaterials, mat.id]);
                              } else {
                                setSelectedMaterials(selectedMaterials.filter(m => m !== mat.id));
                              }
                            }}
                            className="w-3.5 h-3.5 text-brand-600 rounded focus:ring-brand-500"
                          />
                          <span className="text-[10px] font-bold text-slate-600 truncate">{mat.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* AI OCR Scanner Modal */}
      <OcrScannerModal isOpen={isOcrOpen} onClose={() => setIsOcrOpen(false)} />
    </div>
  );
};
