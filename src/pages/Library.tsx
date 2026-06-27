import React, { useState, useEffect } from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import { summarizeReferenceMaterial } from '../services/gemini';
import {
  FileText,
  Link as LinkIcon,
  Video,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Upload
} from 'lucide-react';

interface ReferenceMaterial {
  id: string;
  grade: number;
  semester: number;
  material_type: 'file' | 'link' | 'youtube';
  title: string;
  url: string | null;
  file_path: string | null;
  file_size: number | null;
  summary: string | null;
  user_memo: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  title: string;
  activity_type: string;
}

interface TargetUniv {
  id: string;
  university_name: string;
  department_name: string;
}

export const Library: React.FC = () => {
  const { activeGrade, activeSemester, user } = useActiveSemester();
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [universities, setUniversities] = useState<TargetUniv[]>([]);
  const [connections, setConnections] = useState<Record<string, Array<{ type: string; id: string; name: string }>>>({});

  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // --- Form States ---
  const [mType, setMType] = useState<'file' | 'link' | 'youtube'>('link');
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Connections selection
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedUnivId, setSelectedUnivId] = useState<string>('');

  // AI loading indicator for modal
  const [aiSummarizing, setAiSummarizing] = useState<boolean>(false);

  const fetchLibraryData = async () => {
    setLoading(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      // Materials Load
      const storedMats = localStorage.getItem('mock_reference_materials');
      if (storedMats) {
        setMaterials(JSON.parse(storedMats));
      } else {
        const dummyMats: ReferenceMaterial[] = [
          {
            id: 'mat-1',
            grade: 1,
            semester: 1,
            material_type: 'link',
            title: '서울대 컴퓨터공학과 학부 권장 도서 리스트',
            url: 'https://cse.snu.ac.kr/books',
            file_path: null,
            file_size: null,
            summary: '컴퓨터 공학 기초 소양 및 프로그래밍 입문자를 위한 필수 고전 도서 리스트가 정리된 포스트입니다. 수학적 사고와 추상화 훈련에 적합한 다수의 도서가 수록되어 있어 생기부 독서 연계에 매우 용이함.',
            user_memo: '2학년 1학기까지 여기 추천 도서 중 최소 3권 완독할 것.',
            created_at: new Date().toISOString()
          },
          {
            id: 'mat-2',
            grade: 1,
            semester: 1,
            material_type: 'file',
            title: '이진 탐색 알고리즘 Pygame 구현 예제 소스 코드.zip',
            url: null,
            file_path: 'mock-path/binary_search_pygame.zip',
            file_size: 450000,
            summary: '파이썬 Pygame 라이브러리를 사용해 정렬된 데이터셋에서 이진 탐색이 이루어지는 단계를 그래픽으로 도식화한 시뮬레이터 소스코드 파일입니다.',
            user_memo: '컴퓨터 동아리 산출물 실적물 증빙용 파일.',
            created_at: new Date().toISOString()
          },
          {
            id: 'mat-3',
            grade: 1,
            semester: 1,
            material_type: 'youtube',
            title: '기후 변동과 대기 순환 빅데이터 시각화 특강 - EBS',
            url: 'https://youtube.com/watch?v=mockvideo',
            file_path: null,
            file_size: null,
            summary: 'EBS 다큐 기반 기후 데이터 시각화 교육 강의 영상입니다. 파이썬 Pandas와 Matplotlib를 이용하여 탄소 농도 및 해수온 상승 간의 인과관계를 빅데이터 모델로 가설 검증하는 방식을 다룹니다.',
            user_memo: '환경 보호 캠페인 기획 시 데이터 검증 근거 자료로 활용함.',
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('mock_reference_materials', JSON.stringify(dummyMats));
        setMaterials(dummyMats);
      }

      // Load Activities for options
      const storedActs = localStorage.getItem('mock_activities') || '[]';
      setActivities(JSON.parse(storedActs));

      // Load Universities for options
      const storedUniv = localStorage.getItem('mock_target_universities') || '[]';
      setUniversities(JSON.parse(storedUniv));

      // Load connections mapping
      const storedConn = localStorage.getItem('mock_material_connections_full');
      if (storedConn) {
        setConnections(JSON.parse(storedConn));
      } else {
        const dummyConn: Record<string, Array<{ type: string; id: string; name: string }>> = {
          'mat-1': [{ type: 'activity', id: 'act-3', name: '도서 독서 기록' }],
          'mat-2': [{ type: 'activity', id: 'act-2', name: '알고리즘 탐구반 - 이진 탐색 알고리즘 시각화 프로젝트' }],
          'mat-3': [{ type: 'activity', id: 'act-1', name: '학급 자치회 환경 보호 캠페인 기획 및 주도' }]
        };
        localStorage.setItem('mock_material_connections_full', JSON.stringify(dummyConn));
        setConnections(dummyConn);
      }

      setLoading(false);
      return;
    }

    try {
      const { data: matData } = await supabase.from('reference_materials').select('*').eq('student_id', user?.id);
      setMaterials(matData || []);

      const { data: actData } = await supabase.from('activities').select('id, title, activity_type').eq('student_id', user?.id);
      setActivities(actData || []);

      const { data: uniData } = await supabase.from('target_universities').select('id, university_name, department_name').eq('student_id', user?.id);
      setUniversities(uniData?.map(u => ({ id: u.id, university_name: u.university_name, department_name: u.department_name })) || []);

      // Connections fetching from db (Since rpc might not exist, fetch material_connections directly)
      const { data: directConn } = await supabase.from('material_connections').select('*');
      
      const grouped: Record<string, Array<{ type: string; id: string; name: string }>> = {};
      
      // We will perform mapping manually
      directConn?.forEach((c) => {
        const matId = c.material_id;
        if (!grouped[matId]) grouped[matId] = [];

        if (c.connected_type === 'activity') {
          const act = actData?.find(a => a.id === c.connected_id);
          if (act) {
            grouped[matId].push({ type: 'activity', id: act.id, name: `[${act.activity_type}] ${act.title}` });
          }
        } else if (c.connected_type === 'target_university') {
          const uni = uniData?.find(u => u.id === c.connected_id);
          if (uni) {
            grouped[matId].push({ type: 'target_university', id: uni.id, name: `[분석] ${uni.university_name} ${uni.department_name}` });
          }
        }
      });

      setConnections(grouped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, [user]);

  // --- 자료 추가 ---
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setAiSummarizing(true);
    let summaryText = '';

    try {
      // 1. Generate AI summary
      const textToSummarize = mType === 'file' ? `파일 메모: ${memo}` : `URL: ${url}. 메모: ${memo}`;
      summaryText = await summarizeReferenceMaterial(title, textToSummarize, mType);

      // 2. Handle file upload if file type
      let filePath = null;
      let fileSize = null;
      
      const isMock = localStorage.getItem('mock_user_active') === 'true';

      if (mType === 'file' && selectedFile) {
        fileSize = selectedFile.size;
        
        if (!isMock) {
          const bucketName = 'reference-materials';
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(bucketName)
            .upload(fileName, selectedFile);
            
          if (uploadErr) throw uploadErr;
          filePath = uploadData?.path || null;
        } else {
          filePath = `mock-storage/${Date.now()}-${selectedFile.name}`;
        }
      }

      const newMaterial = {
        grade: activeGrade,
        semester: activeSemester,
        material_type: mType,
        title,
        url: mType !== 'file' ? url : null,
        file_path: filePath,
        file_size: fileSize,
        summary: summaryText,
        user_memo: memo || ''
      };

      if (isMock) {
        const matId = 'mat-' + Date.now();
        const updatedMats = [...materials, { ...newMaterial, id: matId, created_at: new Date().toISOString() }];
        localStorage.setItem('mock_reference_materials', JSON.stringify(updatedMats));
        setMaterials(updatedMats);

        // Save mock connections
        const newConns = [];
        if (selectedActivityId) {
          const act = activities.find(a => a.id === selectedActivityId);
          if (act) newConns.push({ type: 'activity', id: act.id, name: `[${act.activity_type}] ${act.title}` });
        }
        if (selectedUnivId) {
          const uni = universities.find(u => u.id === selectedUnivId);
          if (uni) newConns.push({ type: 'target_university', id: uni.id, name: `[분석] ${uni.university_name} ${uni.department_name}` });
        }

        if (newConns.length > 0) {
          const updatedConnMap = { ...connections, [matId]: newConns };
          localStorage.setItem('mock_material_connections_full', JSON.stringify(updatedConnMap));
          setConnections(updatedConnMap);
          
          // Also link to activity connection table (activities.tsx refers to this)
          const storedActConn = JSON.parse(localStorage.getItem('mock_material_connections') || '{}');
          if (selectedActivityId) {
            if (!storedActConn[selectedActivityId]) storedActConn[selectedActivityId] = [];
            storedActConn[selectedActivityId].push(matId);
          }
          localStorage.setItem('mock_material_connections', JSON.stringify(storedActConn));
        }

        closeModal();
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('reference_materials')
          .insert([{ ...newMaterial, student_id: user?.id }])
          .select('id')
          .single();
          
        if (insertErr) throw insertErr;

        // Insert database connections
        if (inserted) {
          if (selectedActivityId) {
            await supabase.from('material_connections').insert({
              material_id: inserted.id,
              connected_type: 'activity',
              connected_id: selectedActivityId
            });
          }
          if (selectedUnivId) {
            await supabase.from('material_connections').insert({
              material_id: inserted.id,
              connected_type: 'target_university',
              connected_id: selectedUnivId
            });
          }
        }
        
        await fetchLibraryData();
        closeModal();
      }

    } catch (err) {
      console.error(err);
      alert('자료 저장 및 AI 요약에 실패했습니다.');
    } finally {
      setAiSummarizing(false);
    }
  };

  // --- 자료 삭제 ---
  const handleDeleteMaterial = async (id: string, filePath: string | null) => {
    if (!confirm('자료를 삭제하면 해당 활동과의 연동 데이터도 삭제됩니다. 계속하시겠습니까?')) return;
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      const updated = materials.filter(m => m.id !== id);
      localStorage.setItem('mock_reference_materials', JSON.stringify(updated));
      setMaterials(updated);

      const updatedConn = { ...connections };
      delete updatedConn[id];
      localStorage.setItem('mock_material_connections_full', JSON.stringify(updatedConn));
      setConnections(updatedConn);
      return;
    }

    try {
      // 1. Delete file from storage if exists
      if (filePath) {
        await supabase.storage.from('reference-materials').remove([filePath]);
      }
      
      // 2. Delete row from db (connections cascade)
      const { error } = await supabase.from('reference_materials').delete().eq('id', id);
      if (error) throw error;

      await fetchLibraryData();
    } catch (err) {
      console.error(err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setUrl('');
    setMemo('');
    setSelectedFile(null);
    setSelectedActivityId('');
    setSelectedUnivId('');
  };

  // Filter materials based on global active grade/semester
  const filteredMaterials = materials.filter(
    (m) => m.grade === activeGrade && m.semester === activeSemester
  );

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="text-xs text-slate-500 font-bold">
          <span>{activeGrade}학년 {activeSemester}학기 수집된 참고 자료 ({filteredMaterials.length}건)</span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center gap-1.5"
        >
          <Plus className="w-4.5 h-4.5" />
          참고자료 수집하기
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium mt-3">수집 목록 동기화 중...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium">이번 학기에 등록된 참고 자료가 없습니다.</p>
          <p className="text-[10px] text-slate-400 font-bold mt-1">교과 탐구나 대학 분석 시 연계할 자료(논문 링크, 파일, 유튜브 강의)를 수집해보세요.</p>
        </div>
      ) : (
        /* Materials Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => {
            const matConns = connections[mat.id] || [];
            return (
              <div key={mat.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group">
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      {mat.material_type === 'file' ? (
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                      ) : mat.material_type === 'youtube' ? (
                        <Video className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      {mat.material_type.toUpperCase()}
                    </span>

                    <button
                      onClick={() => handleDeleteMaterial(mat.id, mat.file_path)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-slate-300 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h5 className="font-extrabold text-sm text-slate-800 leading-snug mb-2 pr-4">{mat.title}</h5>

                  {/* AI Summary */}
                  {mat.summary && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-3">
                      <p className="text-[9px] font-extrabold text-slate-400 flex items-center gap-0.5 mb-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        AI 자동 요약
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">{mat.summary}</p>
                    </div>
                  )}

                  {/* User Memo */}
                  {mat.user_memo && (
                    <div className="text-[11px] text-slate-500 font-medium pl-1 mb-3">
                      <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">나의 노트</span>
                      <p className="italic">&ldquo;{mat.user_memo}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Footer: External action & connections */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  {/* File / URL buttons */}
                  {mat.material_type !== 'file' && mat.url && (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-1.5 w-full bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-700 transition-colors border border-slate-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                      자료 링크 열기
                    </a>
                  )}
                  {mat.material_type === 'file' && (
                    <div className="text-center py-1.5 bg-slate-50 rounded-xl text-[9px] text-slate-500 font-bold border border-slate-100">
                      파일 보관 완료 ({mat.file_size ? `${(mat.file_size / 1024).toFixed(0)} KB` : '크기 불명'})
                    </div>
                  )}

                  {/* Connections tags */}
                  {matConns.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400">연결된 항목:</p>
                      <div className="flex flex-wrap gap-1">
                        {matConns.map((c, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-[9px] font-extrabold max-w-[180px] truncate ${
                              c.type === 'activity' ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-50 text-brand-600'
                            }`}
                            title={c.name}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD MATERIAL MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-600" />
              참고자료 등록 ({activeGrade}학년 {activeSemester}학기)
            </h4>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">자료 유형 선택</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/55">
                  {(['link', 'youtube', 'file'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMType(t)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all uppercase ${
                        mType === t ? 'bg-white text-slate-800 shadow' : 'text-slate-500'
                      }`}
                    >
                      {t === 'link' ? '웹 사이트' : t === 'youtube' ? '유튜브' : '로컬 파일'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">자료 제목</label>
                <input
                  type="text"
                  required
                  placeholder="예: 2027 컴퓨터공학과 학종 가이드북"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              {mType !== 'file' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">인터넷 주소 (URL)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">로컬 파일 첨부</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold file:mr-4 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 hover:file:bg-slate-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">나의 메모 / 메모리 요약 보강</label>
                <textarea
                  placeholder="자료의 수집 목적이나 핵심 내용을 가볍게 기재해주세요."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none h-16 resize-none"
                />
              </div>

              {/* Connections linking selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">생기부 활동과 연동</label>
                  <select
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none"
                  >
                    <option value="">연동 안 함</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.activity_type}] {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">진학 분석과 연동</label>
                  <select
                    value={selectedUnivId}
                    onChange={(e) => setSelectedUnivId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none"
                  >
                    <option value="">연동 안 함</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.university_name} {u.department_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={aiSummarizing}
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={aiSummarizing}
                  className="bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center gap-1.5"
                >
                  {aiSummarizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Gemini AI 요약 생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>저장 & 요약</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
