import React, { useState } from 'react';
import { analyzeDocumentOcr } from '../services/gemini';
import { supabase } from '../services/supabase';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { X, Upload, Sparkles, Check, FileText } from 'lucide-react';

interface OcrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useActiveSemester();
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [ocrData, setOcrData] = useState<{
    academic_records: any[];
    mock_exam_records: any[];
    activities: any[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'academic' | 'mock' | 'activities'>('academic');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setOcrData(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setLoading(true);
    setStatusMsg('문서(이미지/PDF) 파일을 해독하는 중입니다...');

    try {
      const reader = new FileReader();
      
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          // Extract base64 prefix
          const pureBase64 = base64.split(',')[1] || base64;
          resolve(pureBase64);
        };
      });

      reader.readAsDataURL(file);
      const pureBase64 = await fileDataPromise;

      // Call Gemini OCR scan engine
      const parsed = await analyzeDocumentOcr(pureBase64, file.type);
      setOcrData(parsed);

      // Auto focus active tab
      if (parsed.academic_records.length > 0) {
        setActiveTab('academic');
      } else if (parsed.mock_exam_records.length > 0) {
        setActiveTab('mock');
      } else if (parsed.activities.length > 0) {
        setActiveTab('activities');
      }
    } catch (err) {
      console.error(err);
      alert('문서 판독에 실패했습니다. 유효한 이미지/PDF 파일인지 확인하십시오.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleSaveAll = async () => {
    if (!ocrData) return;

    setLoading(true);
    setStatusMsg('판독 완료 데이터를 학생 데이터베이스에 저장하고 있습니다...');

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    try {
      if (isMock) {
        // Save to LocalStorage
        if (ocrData.academic_records.length > 0) {
          const current = JSON.parse(localStorage.getItem('mock_academic_records') || '[]');
          const updated = [...current, ...ocrData.academic_records.map(r => ({ ...r, id: 'ocr-acad-' + Math.random().toString(36).substr(2, 9) }))];
          localStorage.setItem('mock_academic_records', JSON.stringify(updated));
        }

        if (ocrData.mock_exam_records.length > 0) {
          const current = JSON.parse(localStorage.getItem('mock_exam_records') || '[]');
          const updated = [...current, ...ocrData.mock_exam_records.map(r => ({ ...r, id: 'ocr-mock-' + Math.random().toString(36).substr(2, 9) }))];
          localStorage.setItem('mock_exam_records', JSON.stringify(updated));
        }

        if (ocrData.activities.length > 0) {
          const current = JSON.parse(localStorage.getItem('mock_activities') || '[]');
          const updated = [...current, ...ocrData.activities.map(r => ({ ...r, id: 'ocr-act-' + Math.random().toString(36).substr(2, 9) }))];
          localStorage.setItem('mock_activities', JSON.stringify(updated));
        }
      } else {
        // Save to Supabase Cloud
        if (ocrData.academic_records.length > 0) {
          const records = ocrData.academic_records.map(r => ({ ...r, student_id: user?.id }));
          const { error } = await supabase.from('academic_records').insert(records);
          if (error) throw error;
        }

        if (ocrData.mock_exam_records.length > 0) {
          const records = ocrData.mock_exam_records.map(r => ({ ...r, student_id: user?.id }));
          const { error } = await supabase.from('mock_exam_records').insert(records);
          if (error) throw error;
        }

        if (ocrData.activities.length > 0) {
          const records = ocrData.activities.map(r => ({ ...r, student_id: user?.id }));
          const { error } = await supabase.from('activities').insert(records);
          if (error) throw error;
        }
      }

      alert('AI 추출 성적 및 활동 기록이 최종 저장소에 일괄 기록되었습니다!');
      if (onSuccess) onSuccess();
      onClose();
      // Reload pages to reflect changes
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('데이터베이스 저장 중 에러가 발생했습니다.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-100 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">AI 학생부 & 성적표 스마트 스캐너</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">성적표 이미지나 생활기록부 PDF 파일을 업로드하면 AI가 성적과 활동을 판독해 자동 기입합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-800">학생부 분석 판독 작동 중...</p>
              <p className="text-[10px] text-slate-400 font-semibold">{statusMsg}</p>
            </div>
          ) : !ocrData ? (
            // 파일 업로드 대기존
            <div className="max-w-xl mx-auto py-10 space-y-6">
              <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-3xl p-10 text-center transition-all bg-slate-50/50 relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow flex items-center justify-center mx-auto text-slate-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">성적표 이미지 또는 생기부 PDF를 끌어다 놓으세요</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">지원 규격: JPG, PNG, WEBP, PDF (최대 10MB)</p>
                  </div>
                </div>
              </div>

              {file && (
                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-brand-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{file.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleScan}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    스캔 및 분석 시작
                  </button>
                </div>
              )}
            </div>
          ) : (
            // 스캔 결과 미리보기 디스플레이
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 p-4.5 rounded-2xl flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-emerald-800">생활기록부 판독 완료</h4>
                  <p className="text-[10px] text-slate-600 mt-1 font-semibold leading-relaxed">
                    AI가 분석 완료한 아래의 추출 데이터를 확인하고 검토해 주십시오. 이상이 없다면 하단의 "기록부 최종 등록" 버튼을 클릭하여 적용할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/40">
                <button
                  onClick={() => setActiveTab('academic')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'academic' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  내신 성적 ({ocrData.academic_records.length}건)
                </button>
                <button
                  onClick={() => setActiveTab('mock')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'mock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  모의고사 성적 ({ocrData.mock_exam_records.length}건)
                </button>
                <button
                  onClick={() => setActiveTab('activities')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'activities' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  생기부 활동 ({ocrData.activities.length}건)
                </button>
              </div>

              {/* 탭 본문 내용 */}
              <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-4.5 min-h-[250px]">
                
                {/* 1) 내신 성적 */}
                {activeTab === 'academic' && (
                  ocrData.academic_records.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-12">판독된 내신 성적이 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400">
                            <th className="pb-2">학년/학기</th>
                            <th className="pb-2">구분</th>
                            <th className="pb-2">교과/과목</th>
                            <th className="pb-2 text-center">단위</th>
                            <th className="pb-2 text-center">원점수</th>
                            <th className="pb-2 text-center">등급</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ocrData.academic_records.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2.5">{r.grade}학년 {r.semester}학기</td>
                              <td className="py-2.5 text-slate-500">{r.exam_type}</td>
                              <td className="py-2.5 font-bold text-slate-800">{r.subject_name}</td>
                              <td className="py-2.5 text-center">{r.credit_units}</td>
                              <td className="py-2.5 text-center">{r.original_score || '-'}</td>
                              <td className="py-2.5 text-center">
                                <span className="bg-brand-50 text-brand-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {r.rank_rating || '-'}등급
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* 2) 모의고사 성적 */}
                {activeTab === 'mock' && (
                  ocrData.mock_exam_records.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-12">판독된 모의고사 성적이 없습니다.</p>
                  ) : (
                    <div className="space-y-4">
                      {ocrData.mock_exam_records.map((m, idx) => (
                        <div key={idx} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-3">
                          <div className="flex items-center justify-between font-bold text-xs text-slate-800 pb-2 border-b border-slate-100">
                            <span>{m.grade}학년 | {m.exam_name}</span>
                            <span className="text-[10px] text-slate-400">{m.exam_date}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-[10px] font-bold text-slate-600">
                            {Object.keys(m.results).map((subKey) => {
                              const res = m.results[subKey];
                              return (
                                <div key={subKey} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                  <span>{subKey}</span>
                                  <span className="text-brand-600 font-extrabold">{res.grade}등급 ({res.percentile || '-'}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 3) 생기부 활동 */}
                {activeTab === 'activities' && (
                  ocrData.activities.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-12">판독된 활동 내역이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {ocrData.activities.map((a, i) => (
                        <div key={i} className="bg-white border border-slate-150 p-4 rounded-xl shadow-sm text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-[10px] text-slate-400">
                            <span>{a.grade}학년 {a.semester}학기 | {a.activity_type}</span>
                            {a.subject_name && <span className="text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">과목: {a.subject_name}</span>}
                          </div>
                          <p className="font-extrabold text-slate-800">{a.title}</p>
                          <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{a.content}</p>
                          {a.related_book && (
                            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                              <span>📖 연계 도서:</span>
                              <span className="underline decoration-wavy decoration-indigo-400 text-indigo-600">{a.related_book}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            취소
          </button>
          
          {ocrData && (
            <button
              onClick={handleSaveAll}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              최종 데이터 일괄 등록
            </button>
          )}
        </div>

      </div>
      
    </div>
  );
};
