import React, { useState, useEffect } from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import { Plus, Trash2, Save, FileSpreadsheet, Percent, HelpCircle, Sparkles } from 'lucide-react';
import { OcrScannerModal } from '../components/OcrScannerModal';

interface AcademicRecord {
  id: string;
  grade: number;
  semester: number;
  exam_type: '중간고사' | '기말고사' | '학기말고사';
  subject_name: string;
  rank_rating: number | null;
  original_score: number | null;
  standard_deviation: number | null;
  credit_units: number;
  notes?: string;
}

interface MockExamRecord {
  id: string;
  grade: number;
  exam_date: string;
  exam_name: string;
  results: Record<string, {
    subject?: string;
    grade: number | null;
    standard_score: number | null;
    percentile: number | null;
    raw_score?: number | null;
  }>;
  average_grade: number | null;
}

const estimateGrade = (subject: string, percentile: number | null, rawScore: number | null): number | null => {
  if (subject === '영어') {
    if (rawScore === null) return null;
    if (rawScore >= 90) return 1;
    if (rawScore >= 80) return 2;
    if (rawScore >= 70) return 3;
    if (rawScore >= 60) return 4;
    if (rawScore >= 50) return 5;
    if (rawScore >= 40) return 6;
    if (rawScore >= 30) return 7;
    if (rawScore >= 20) return 8;
    return 9;
  }
  if (subject === '한국사') {
    if (rawScore === null) return null;
    if (rawScore >= 40) return 1;
    if (rawScore >= 35) return 2;
    if (rawScore >= 30) return 3;
    if (rawScore >= 25) return 4;
    if (rawScore >= 20) return 5;
    if (rawScore >= 15) return 6;
    if (rawScore >= 10) return 7;
    if (rawScore >= 5) return 8;
    return 9;
  }
  if (percentile === null) return null;
  if (percentile >= 96) return 1;
  if (percentile >= 89) return 2;
  if (percentile >= 77) return 3;
  if (percentile >= 60) return 4;
  if (percentile >= 40) return 5;
  if (percentile >= 23) return 6;
  if (percentile >= 11) return 7;
  if (percentile >= 4) return 8;
  return 9;
};

export const Academic: React.FC = () => {
  const { activeGrade, activeSemester, user } = useActiveSemester();
  const [activeTab, setActiveTab] = useState<'academic' | 'mock'>('academic');
  const [loading, setLoading] = useState<boolean>(false);
  const [isOcrOpen, setIsOcrOpen] = useState<boolean>(false);

  // --- 내신 성적 State ---
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>([]);
  const [academicForm, setAcademicForm] = useState<Partial<AcademicRecord>>({
    exam_type: '학기말고사',
    subject_name: '',
    rank_rating: 1,
    original_score: 90,
    standard_deviation: 15,
    credit_units: 2,
    notes: ''
  });

  // --- 모의고사 성적 State ---
  const [mockRecords, setMockRecords] = useState<MockExamRecord[]>([]);
  const [mockForm, setMockForm] = useState<Omit<MockExamRecord, 'id' | 'average_grade'>>({
    grade: activeGrade,
    exam_date: new Date().toISOString().split('T')[0],
    exam_name: '3월 전국연합학력평가',
    results: {
      '국어': { grade: 1, standard_score: 130, percentile: 96 },
      '수학': { grade: 1, standard_score: 135, percentile: 98 },
      '영어': { grade: 1, standard_score: null, percentile: null },
      '한국사': { grade: 1, standard_score: null, percentile: null },
      '탐구1': { subject: '물리학Ⅰ', grade: 2, standard_score: 62, percentile: 89 },
      '탐구2': { subject: '화학Ⅰ', grade: 3, standard_score: 55, percentile: 78 }
    }
  });

  // --- 데이터 패칭 ---
  const fetchAcademicData = async () => {
    setLoading(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const stored = localStorage.getItem('mock_academic_records');
      if (stored) {
        setAcademicRecords(JSON.parse(stored));
      } else {
        const dummy: AcademicRecord[] = [
          { id: '1', grade: 1, semester: 1, exam_type: '학기말고사', subject_name: '국어', rank_rating: 2, original_score: 91, standard_deviation: 12.5, credit_units: 4, notes: '중간 대비 기말 성적 상승' },
          { id: '2', grade: 1, semester: 1, exam_type: '학기말고사', subject_name: '수학Ⅰ', rank_rating: 1, original_score: 96, standard_deviation: 10.2, credit_units: 4, notes: '수학 전교 5등 이내' },
          { id: '3', grade: 1, semester: 1, exam_type: '학기말고사', subject_name: '영어', rank_rating: 2, original_score: 89, standard_deviation: 14.0, credit_units: 4, notes: '영어 회화 강점' },
          { id: '4', grade: 1, semester: 1, exam_type: '학기말고사', subject_name: '통합과학', rank_rating: 1, original_score: 98, standard_deviation: 8.9, credit_units: 3, notes: '물리 파트 우수' },
          { id: '5', grade: 1, semester: 1, exam_type: '학기말고사', subject_name: '통합사회', rank_rating: 3, original_score: 84, standard_deviation: 16.2, credit_units: 3, notes: '평이한 수준' }
        ];
        localStorage.setItem('mock_academic_records', JSON.stringify(dummy));
        setAcademicRecords(dummy);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('academic_records')
        .select('*')
        .eq('student_id', user?.id);
      if (error) throw error;
      setAcademicRecords(data || []);
    } catch (err) {
      console.error('Failed to fetch academic records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMockData = async () => {
    setLoading(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const stored = localStorage.getItem('mock_exam_records');
      if (stored) {
        setMockRecords(JSON.parse(stored));
      } else {
        const dummy: MockExamRecord[] = [
          {
            id: 'm1',
            grade: 1,
            exam_date: '2024-03-20',
            exam_name: '3월 전국연합학력평가',
            results: {
              '국어': { grade: 2, standard_score: 125, percentile: 91 },
              '수학': { grade: 1, standard_score: 138, percentile: 99 },
              '영어': { grade: 2, standard_score: null, percentile: null },
              '한국사': { grade: 1, standard_score: null, percentile: null },
              '탐구1': { subject: '통합과학', grade: 1, standard_score: 68, percentile: 97 },
              '탐구2': { subject: '통합사회', grade: 2, standard_score: 61, percentile: 89 }
            },
            average_grade: 1.5
          },
          {
            id: 'm2',
            grade: 1,
            exam_date: '2024-06-04',
            exam_name: '6월 전국연합학력평가',
            results: {
              '국어': { grade: 1, standard_score: 132, percentile: 97 },
              '수학': { grade: 1, standard_score: 136, percentile: 98 },
              '영어': { grade: 1, standard_score: null, percentile: null },
              '한국사': { grade: 1, standard_score: null, percentile: null },
              '탐구1': { subject: '통합과학', grade: 2, standard_score: 60, percentile: 87 },
              '탐구2': { subject: '통합사회', grade: 2, standard_score: 63, percentile: 91 }
            },
            average_grade: 1.33
          }
        ];
        localStorage.setItem('mock_exam_records', JSON.stringify(dummy));
        setMockRecords(dummy);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mock_exam_records')
        .select('*')
        .eq('student_id', user?.id);
      if (error) throw error;
      setMockRecords(data || []);
    } catch (err) {
      console.error('Failed to fetch mock exam records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
    fetchMockData();
  }, [user]);

  // --- 내신 성적 추가 ---
  const handleAddAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicForm.subject_name) return;

    const newRecord = {
      grade: activeGrade,
      semester: activeSemester,
      exam_type: academicForm.exam_type!,
      subject_name: academicForm.subject_name,
      rank_rating: academicForm.rank_rating ? Number(academicForm.rank_rating) : null,
      original_score: academicForm.original_score ? Number(academicForm.original_score) : null,
      standard_deviation: academicForm.standard_deviation ? Number(academicForm.standard_deviation) : null,
      credit_units: Number(academicForm.credit_units),
      notes: academicForm.notes || ''
    };

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = [...academicRecords, { ...newRecord, id: Date.now().toString() }];
      localStorage.setItem('mock_academic_records', JSON.stringify(updated));
      setAcademicRecords(updated);
      setAcademicForm({ ...academicForm, subject_name: '', notes: '' });
      return;
    }

    try {
      const { error } = await supabase
        .from('academic_records')
        .insert([{ ...newRecord, student_id: user?.id }]);
      if (error) throw error;
      fetchAcademicData();
      setAcademicForm({ ...academicForm, subject_name: '', notes: '' });
    } catch (err) {
      alert('성적 등록에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 내신 성적 삭제 ---
  const handleDeleteAcademic = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = academicRecords.filter(r => r.id !== id);
      localStorage.setItem('mock_academic_records', JSON.stringify(updated));
      setAcademicRecords(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('academic_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchAcademicData();
    } catch (err) {
      alert('성적 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 모의고사 성적 추가 ---
  const handleAddMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockForm.exam_name) return;

    // Calculate average grade
    const validGrades = Object.values(mockForm.results)
      .map(r => r.grade)
      .filter((g): g is number => g !== null);
    
    const sum = validGrades.reduce((acc, curr) => acc + curr, 0);
    const average = validGrades.length > 0 ? Number((sum / validGrades.length).toFixed(2)) : null;

    const newRecord = {
      grade: activeGrade,
      exam_date: mockForm.exam_date,
      exam_name: mockForm.exam_name,
      results: mockForm.results,
      average_grade: average
    };

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = [...mockRecords, { ...newRecord, id: Date.now().toString() }];
      localStorage.setItem('mock_exam_records', JSON.stringify(updated));
      setMockRecords(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('mock_exam_records')
        .insert([{ ...newRecord, student_id: user?.id }]);
      if (error) throw error;
      fetchMockData();
    } catch (err) {
      alert('모의고사 성적 등록에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 모의고사 성적 삭제 ---
  const handleDeleteMock = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = mockRecords.filter(r => r.id !== id);
      localStorage.setItem('mock_exam_records', JSON.stringify(updated));
      setMockRecords(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('mock_exam_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchMockData();
    } catch (err) {
      alert('성적 삭제에 실패했습니다.');
      console.error(err);
    }
  };

  // --- 등급 및 가중평균 산출 헬퍼 ---
  const filteredAcademic = academicRecords.filter(
    (r) => r.grade === activeGrade && r.semester === activeSemester
  );

  const calculateGpa = (records: AcademicRecord[]) => {
    // Only count final overall records for GPA usually, but here we calculate on filtered set
    // Exclude records with null rank_rating (e.g. Pass/Fail or Achievement A/B/C)
    const validRecords = records.filter(r => r.rank_rating !== null);
    if (validRecords.length === 0) return '-';
    
    const totalCredits = validRecords.reduce((sum, r) => sum + r.credit_units, 0);
    const weightedSum = validRecords.reduce((sum, r) => sum + (r.rank_rating! * r.credit_units), 0);
    return (weightedSum / totalCredits).toFixed(2);
  };

  const gpa = calculateGpa(filteredAcademic);

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-6 text-white shadow-lg shadow-brand-900/10">
          <p className="text-white/70 text-xs font-semibold">선택 학기 내신 평점</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-4xl font-black">{gpa}</h2>
            <span className="text-xs text-white/80">등급</span>
          </div>
          <p className="text-white/60 text-[10px] mt-2">
            {activeGrade}학년 {activeSemester}학기 등록된 과목 이수단위 가중 평균
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-semibold">내신 등록 과목</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-4xl font-extrabold text-slate-800">{filteredAcademic.length}</h2>
            <span className="text-xs text-slate-500">개 과목</span>
          </div>
          <p className="text-slate-400 text-[10px] mt-2">
            총 {filteredAcademic.reduce((sum, r) => sum + r.credit_units, 0)} 이수단위 기록됨
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-semibold">등록된 모의고사</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-4xl font-extrabold text-slate-800">
              {mockRecords.filter(r => r.grade === activeGrade).length}
            </h2>
            <span className="text-xs text-slate-500">회 시행</span>
          </div>
          <p className="text-slate-400 text-[10px] mt-2">
            {activeGrade}학년 중 입력 완료된 모평/학평 횟수
          </p>
        </div>
      </div>

      {/* Tabs & AI Scanner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/40">
          <button
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'academic'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            내신 성적 관리
          </button>
          <button
            onClick={() => setActiveTab('mock')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mock'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Percent className="w-4 h-4" />
            모의고사 성적 관리
          </button>
        </div>

        <button
          onClick={() => setIsOcrOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-900/10 flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          AI 성적표/생기부 스캔 입력
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium mt-3">성적 정보를 동기화 중...</p>
        </div>
      ) : activeTab === 'academic' ? (
        // --- 내신성적 입력 및 리스트 ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 입력 폼 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-fit">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-600" />
              성적 추가 ({activeGrade}학년 {activeSemester}학기)
            </h4>
            <form onSubmit={handleAddAcademic} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">시험 구분</label>
                <select
                  value={academicForm.exam_type}
                  onChange={(e) => setAcademicForm({ ...academicForm, exam_type: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                >
                  <option value="학기말고사">학기말고사 (종합 등급)</option>
                  <option value="중간고사">중간고사</option>
                  <option value="기말고사">기말고사</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">과목명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 수학Ⅰ, 물리학Ⅰ"
                  value={academicForm.subject_name}
                  onChange={(e) => setAcademicForm({ ...academicForm, subject_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">석차 등급 (1~9)</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    placeholder="등급 없음 시 비움"
                    value={academicForm.rank_rating || ''}
                    onChange={(e) => setAcademicForm({ ...academicForm, rank_rating: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">이수 단위</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={academicForm.credit_units}
                    onChange={(e) => setAcademicForm({ ...academicForm, credit_units: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">원점수</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={academicForm.original_score || ''}
                    onChange={(e) => setAcademicForm({ ...academicForm, original_score: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">표준편차</label>
                  <input
                    type="number"
                    step="0.1"
                    value={academicForm.standard_deviation || ''}
                    onChange={(e) => setAcademicForm({ ...academicForm, standard_deviation: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">비고 / 메모</label>
                <textarea
                  placeholder="특이사항이나 다짐 기재"
                  value={academicForm.notes}
                  onChange={(e) => setAcademicForm({ ...academicForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                성적 저장하기
              </button>
            </form>
          </div>

          {/* 성적 목록 테이블 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
            <h4 className="text-sm font-bold text-slate-800 mb-4">
              성적 목록 ({activeGrade}학년 {activeSemester}학기)
            </h4>

            {filteredAcademic.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
                <HelpCircle className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-medium">등록된 성적이 없습니다. 과목을 추가해주세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">구분</th>
                      <th className="pb-3">과목명</th>
                      <th className="pb-3 text-center">등급</th>
                      <th className="pb-3 text-center">이수단위</th>
                      <th className="pb-3 text-center">원점수</th>
                      <th className="pb-3 text-center">표준편차</th>
                      <th className="pb-3">비고</th>
                      <th className="pb-3 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredAcademic.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 text-slate-400">{row.exam_type}</td>
                        <td className="py-3.5 font-bold text-slate-800">{row.subject_name}</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.rank_rating && row.rank_rating <= 2
                              ? 'bg-emerald-50 text-emerald-600'
                              : row.rank_rating && row.rank_rating <= 4
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {row.rank_rating ? `${row.rank_rating}등급` : '이수(Pass)'}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">{row.credit_units}단위</td>
                        <td className="py-3.5 text-center text-slate-500">{row.original_score ?? '-'}</td>
                        <td className="py-3.5 text-center text-slate-500">{row.standard_deviation ?? '-'}</td>
                        <td className="py-3.5 text-slate-400 font-normal max-w-[150px] truncate" title={row.notes}>
                          {row.notes || '-'}
                        </td>
                        <td className="py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteAcademic(row.id)}
                            className="p-1 hover:text-red-500 text-slate-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
      ) : (
        // --- 모의고사 입력 및 리스트 ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 입력 폼 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-fit">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-600" />
              모의고사 추가 ({activeGrade}학년)
            </h4>
            <form onSubmit={handleAddMock} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">시행일</label>
                  <input
                    type="date"
                    required
                    value={mockForm.exam_date}
                    onChange={(e) => setMockForm({ ...mockForm, exam_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">시험 명칭</label>
                  <select
                    value={mockForm.exam_name}
                    onChange={(e) => setMockForm({ ...mockForm, exam_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                  >
                    <option value="3월 전국연합학력평가">3월 학평</option>
                    <option value="4월 전국연합학력평가">4월 학평</option>
                    <option value="6월 수능모의평가">6월 모평</option>
                    <option value="7월 전국연합학력평가">7월 학평</option>
                    <option value="9월 수능모의평가">9월 모평</option>
                    <option value="10월 전국연합학력평가">10월 학평</option>
                    <option value="11월 수능/전국학평">11월 수능/학평</option>
                  </select>
                </div>
              </div>

              {/* 영역별 성적 입력 */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">영역별 성적</p>
                {Object.keys(mockForm.results).map((subjectKey) => {
                  const subjectData = mockForm.results[subjectKey];
                  return (
                    <div key={subjectKey} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="w-14 text-xs font-bold text-slate-700">{subjectKey}</span>
                      
                      {/* 탐구 과목 선택 기능 */}
                      {subjectKey.startsWith('탐구') && (
                        <input
                          type="text"
                          placeholder="과목명"
                          value={subjectData.subject || ''}
                          onChange={(e) => {
                            const newResults = { ...mockForm.results };
                            newResults[subjectKey].subject = e.target.value;
                            setMockForm({ ...mockForm, results: newResults });
                          }}
                          className="w-20 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px] outline-none"
                        />
                      )}

                      {/* 원점수 (raw_score) */}
                      <input
                        type="number"
                        placeholder="원점수"
                        min={0}
                        max={100}
                        value={subjectData.raw_score || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const newResults = { ...mockForm.results };
                          newResults[subjectKey].raw_score = val;

                          // 영어/한국사 등 절대평가 과목은 원점수로 즉시 등급 추정
                          if (subjectKey === '영어' || subjectKey === '한국사') {
                            const est = estimateGrade(subjectKey, newResults[subjectKey].percentile || null, val);
                            if (est !== null) newResults[subjectKey].grade = est;
                          }
                          setMockForm({ ...mockForm, results: newResults });
                        }}
                        className="w-12 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px] text-center outline-none"
                      />

                      <input
                        type="number"
                        placeholder="등급"
                        min={1}
                        max={9}
                        value={subjectData.grade || ''}
                        onChange={(e) => {
                          const newResults = { ...mockForm.results };
                          newResults[subjectKey].grade = e.target.value ? Number(e.target.value) : null;
                          setMockForm({ ...mockForm, results: newResults });
                        }}
                        className="w-8 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px] text-center outline-none"
                      />
                      
                      <input
                        type="number"
                        placeholder="표점"
                        min={0}
                        max={200}
                        value={subjectData.standard_score || ''}
                        onChange={(e) => {
                          const newResults = { ...mockForm.results };
                          newResults[subjectKey].standard_score = e.target.value ? Number(e.target.value) : null;
                          setMockForm({ ...mockForm, results: newResults });
                        }}
                        className="w-10 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px] text-center outline-none"
                      />

                      <input
                        type="number"
                        placeholder="백분위"
                        min={0}
                        max={100}
                        value={subjectData.percentile || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          const newResults = { ...mockForm.results };
                          newResults[subjectKey].percentile = val;

                          // 상대평가 과목은 백분위 기반으로 등급 추정
                          if (subjectKey !== '영어' && subjectKey !== '한국사') {
                            const est = estimateGrade(subjectKey, val, newResults[subjectKey].raw_score || null);
                            if (est !== null) newResults[subjectKey].grade = est;
                          }
                          setMockForm({ ...mockForm, results: newResults });
                        }}
                        className="w-12 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px] text-center outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* 등급 추정 disclaimer */}
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 p-3 rounded-2xl text-[10px] font-semibold leading-relaxed">
                ⚠️ 입력된 백분위/원점수를 기반으로 영역별 등급이 자동 추정됩니다. 각 시험별 실제 오프라인 등급컷(난이도/응시표본)에 따라 실제 성적표의 등급과 다소 오차가 생길 수 있습니다.
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                모의고사 성적 기록
              </button>
            </form>
          </div>

          {/* 모의고사 리스트 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2 flex flex-col">
            <h4 className="text-sm font-bold text-slate-800 mb-4">
              모의고사 기록 목록 ({activeGrade}학년)
            </h4>

            {mockRecords.filter(r => r.grade === activeGrade).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
                <HelpCircle className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-medium">등록된 모의고사 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {mockRecords
                  .filter((r) => r.grade === activeGrade)
                  .map((record) => (
                    <div key={record.id} className="border border-slate-100 rounded-2xl p-4 shadow-inner relative bg-slate-50/20">
                      {/* 카드 헤더 */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div>
                          <h5 className="text-sm font-bold text-slate-800">{record.exam_name}</h5>
                          <p className="text-[10px] text-slate-400 font-semibold">{record.exam_date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-brand-50 text-brand-600 text-xs font-extrabold px-3 py-1 rounded-xl">
                            평균 등급: {record.average_grade ? `${record.average_grade}등급` : '-'}
                          </span>
                          <button
                            onClick={() => handleDeleteMock(record.id)}
                            className="p-1 hover:text-red-500 text-slate-300 transition-colors"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* 성적 그리드 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.keys(record.results).map((subjectKey) => {
                          const res = record.results[subjectKey];
                          return (
                            <div key={subjectKey} className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-inner">
                              <p className="text-[10px] text-slate-400 font-bold">
                                {subjectKey} {res.subject ? `(${res.subject})` : ''}
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-1">
                                {res.grade ? `${res.grade}등급` : '-'}
                              </p>
                              <div className="flex justify-center gap-1.5 mt-0.5 text-[9px] text-slate-400 font-bold">
                                <span>표점: {res.standard_score ?? '-'}</span>
                                <span>|</span>
                                <span>백: {res.percentile ? `${res.percentile}%` : '-'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* AI OCR Scanner Modal */}
      <OcrScannerModal isOpen={isOcrOpen} onClose={() => setIsOcrOpen(false)} />
    </div>
  );
};
