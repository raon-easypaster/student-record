import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, Award, BookOpen, Clock, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface AdminStudentModalProps {
  studentId: string;
  onClose: () => void;
}

export const AdminStudentModal: React.FC<AdminStudentModalProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: result, error: rpcErr } = await supabase.rpc('get_student_full_data', { p_student_id: studentId });
        if (rpcErr) throw rpcErr;
        setData(result);
      } catch (err: any) {
        console.error(err);
        setError('데이터를 불러오지 못했습니다: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">학생 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">오류 발생</h3>
            <p className="text-slate-600 text-sm">{error || '데이터가 없습니다.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { profile, academic_records, activities, target_universities } = data;

  // Calculate GPA
  const calculateGPA = (records: any[]) => {
    const valid = records.filter(r => r.rank_rating !== null);
    if (valid.length === 0) return '-';
    const sum = valid.reduce((acc, r) => acc + (r.rank_rating * r.credit_units), 0);
    const credits = valid.reduce((acc, r) => acc + r.credit_units, 0);
    return (sum / credits).toFixed(2);
  };

  const currentGPA = calculateGPA(academic_records);
  
  // Format chart data
  const chartDataMap: Record<string, { term: string; totalScore: number; totalCredits: number }> = {};
  academic_records.forEach((r: any) => {
    if (r.rank_rating === null) return;
    const key = `${r.grade}-${r.semester}`;
    if (!chartDataMap[key]) {
      chartDataMap[key] = { term: `${r.grade}학년 ${r.semester}학기`, totalScore: 0, totalCredits: 0 };
    }
    chartDataMap[key].totalScore += r.rank_rating * r.credit_units;
    chartDataMap[key].totalCredits += r.credit_units;
  });
  
  const chartData = Object.values(chartDataMap)
    .map(d => ({
      term: d.term,
      GPA: Number((d.totalScore / d.totalCredits).toFixed(2))
    }))
    .sort((a, b) => a.term.localeCompare(b.term));

  const recentAnalysis = target_universities.length > 0 ? target_universities[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-5xl my-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{profile.name} 학생 현황</h2>
            <p className="text-slate-500 text-sm mt-1">{profile.email} | {profile.current_grade}학년 | 희망 진로: {profile.career_wish}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* GPA Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 text-brand-600 mb-2">
                <Award className="w-5 h-5" />
                <h3 className="font-bold text-slate-700">전체 누적 내신</h3>
              </div>
              <p className="text-4xl font-black text-slate-800">{currentGPA} <span className="text-lg text-slate-500 font-medium">등급</span></p>
            </div>

            {/* Activities Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 text-brand-600 mb-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-bold text-slate-700">등록된 활동 수</h3>
              </div>
              <p className="text-4xl font-black text-slate-800">{activities.length} <span className="text-lg text-slate-500 font-medium">건</span></p>
            </div>

            {/* Target Univ Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 text-brand-600 mb-2">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-slate-700">최근 분석 대학</h3>
              </div>
              <p className="text-xl font-bold text-slate-800 truncate">
                {recentAnalysis ? `${recentAnalysis.university_name} ${recentAnalysis.department_name}` : '분석 기록 없음'}
              </p>
              {recentAnalysis?.ai_analysis_result?.match_score && (
                <p className="text-sm text-brand-600 font-medium mt-1">적합도: {recentAnalysis.ai_analysis_result.match_score}점</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GPA Trend Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6">성적 추이</h3>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis reversed domain={[1, 9]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${value} 등급`, '평균 내신']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="GPA" 
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">성적 데이터가 없습니다.</div>
              )}
            </div>

            {/* AI Analysis Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4">최근 AI 분석 요약</h3>
              {recentAnalysis?.ai_analysis_result ? (
                <div className="flex-1 overflow-y-auto text-sm text-slate-600 space-y-4 pr-2">
                  <div className="p-4 bg-brand-50 text-brand-900 rounded-xl">
                    <p className="font-semibold mb-1">총평</p>
                    <p className="leading-relaxed">{recentAnalysis.ai_analysis_result.analysis_text}</p>
                  </div>
                  {recentAnalysis.ai_analysis_result.recommendations?.length > 0 && (
                    <div>
                      <p className="font-semibold text-slate-800 mb-2">주요 보완 제안</p>
                      <ul className="space-y-2">
                        {recentAnalysis.ai_analysis_result.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-brand-500 font-bold">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl">AI 분석 기록이 없습니다.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
