import React, { useState, useEffect } from 'react';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { supabase } from '../services/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { searchUniversityAdmission } from '../services/search';
import type { SearchResult } from '../services/search';
import { analyzeUniversityMatch, generateFinalAdmissionReport, generatePersonalBranding, recommendUniversities } from '../services/gemini';
import type { RecommendationResult } from '../services/gemini';
import {
  Search,
  Sparkles,
  Link as LinkIcon,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Flame,
  Award,
  FileText,
  Compass
} from 'lucide-react';

interface TargetUniversity {
  id: string;
  grade: number;
  semester: number;
  analyzed_at: string;
  university_name: string;
  department_name: string;
  admission_guide_summary: string;
  source_urls: string[];
  ai_analysis_result: {
    match_score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    analysis_text: string;
  };
}

interface CareerGoal {
  id: string;
  grade: number;
  semester: number;
  changed_date: string;
  university_name: string;
  department_name: string;
  priority: number;
  change_reason: string;
  is_current: boolean;
}

export const University: React.FC = () => {
  const { activeGrade, activeSemester, user, profile } = useActiveSemester();
  const [subTab, setSubTab] = useState<'analyze' | 'recommend' | 'history' | 'compare' | 'finalReport' | 'branding'>('analyze');

  // AI Recommendation states
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [generatingRecommendations, setGeneratingRecommendations] = useState<boolean>(false);
  
  // OAuth State
  const [oauthError, setOauthError] = useState<boolean>(false);

  const handleOAuthLogin = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/oauth/start', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank', 'width=500,height=600');
        
        // Start polling for status
        const poll = setInterval(async () => {
          try {
            const statusRes = await fetch('http://127.0.0.1:5000/oauth/status');
            const statusData = await statusRes.json();
            if (statusData.authenticated) {
              clearInterval(poll);
              setOauthError(false);
              alert('구글 로그인이 성공적으로 완료되었습니다! 다시 분석을 시도해 주세요.');
            } else if (statusData.error) {
              clearInterval(poll);
              alert('로그인 실패: ' + statusData.error);
            }
          } catch (e) {
            // Ignore polling errors
          }
        }, 3000);
      }
    } catch (err) {
      alert('백엔드 서버(http://127.0.0.1:5000)가 실행 중이지 않습니다. python backend/app.py 를 실행해 주세요.');
    }
  };

  const handleGenerateRecommendations = async () => {
    setGeneratingRecommendations(true);
    try {
      const isMock = localStorage.getItem('mock_user_active') === 'true';
      let loadedActs = [];
      let loadedAcademic = [];

      if (isMock) {
        const storedActs = localStorage.getItem('mock_activities');
        loadedActs = storedActs ? JSON.parse(storedActs) : [];
        const storedAcademic = localStorage.getItem('mock_academic_records');
        loadedAcademic = storedAcademic ? JSON.parse(storedAcademic) : [];
      } else {
        const { data: acts } = await supabase.from('activities').select('*').eq('student_id', user?.id);
        loadedActs = acts || [];
        const { data: academic } = await supabase.from('academic_records').select('*').eq('student_id', user?.id);
        loadedAcademic = academic || [];
      }

      const payload = {
        profile: profile,
        academic: loadedAcademic,
        activities: loadedActs
      };

      const result = await recommendUniversities(payload);
      setRecommendations(result);
    } catch (err: any) {
      if (!handleOauthBypassError(err)) {
        console.error(err);
        alert('AI 대학 추천 중 오류가 발생했습니다.');
      }
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  // Personal Branding states
  const [brandingData, setBrandingData] = useState<any>(null);
  const [generatingBranding, setGeneratingBranding] = useState<boolean>(false);

  const handleGenerateBranding = async () => {
    setGeneratingBranding(true);
    try {
      const isMock = localStorage.getItem('mock_user_active') === 'true';
      let loadedActs = [];
      let loadedHistory = [];

      if (isMock) {
        const storedActs = localStorage.getItem('mock_activities');
        loadedActs = storedActs ? JSON.parse(storedActs) : [];
        
        const storedHistory = localStorage.getItem('mock_target_universities');
        loadedHistory = storedHistory ? JSON.parse(storedHistory) : [];
      } else {
        const { data: acts } = await supabase.from('activities').select('*').eq('student_id', user?.id);
        loadedActs = acts || [];

        const { data: hist } = await supabase.from('target_universities').select('*').eq('student_id', user?.id);
        loadedHistory = hist || [];
      }

      const branding = await generatePersonalBranding(loadedActs, loadedHistory);
      setBrandingData(branding);
    } catch (err: any) {
      if (!handleOauthBypassError(err)) {
        console.error(err);
        alert('퍼스널 브랜딩 분석 중 오류가 발생했습니다.');
      }
    } finally {
      setGeneratingBranding(false);
    }
  };

  const [univName, setUnivName] = useState<string>('서울대학교');
  const [deptName, setDeptName] = useState<string>('컴퓨터공학부');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const [targetUniversities, setTargetUniversities] = useState<TargetUniversity[]>([]);
  const [careerGoals, setCareerGoals] = useState<CareerGoal[]>([]);

  // Final Report states
  const [finalReportData, setFinalReportData] = useState<any>(null);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<string[]>([]);
  const [generatingFinal, setGeneratingFinal] = useState<boolean>(false);
  const [activities, setActivities] = useState<any[]>([]);

  // History comparison states
  const [compareIdA, setCompareIdA] = useState<string>('');
  const [compareIdB, setCompareIdB] = useState<string>('');
  const [showCompareSplit, setShowCompareSplit] = useState<boolean>(false);

  // Current analysis results
  const [currentSearchDocs, setCurrentSearchDocs] = useState<SearchResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<TargetUniversity['ai_analysis_result'] | null>(null);

  // Goal Form state
  const [goalReason, setGoalReason] = useState<string>('');

  const handleExportPDF = async () => {
    const element = document.getElementById('analysis-report-card');
    if (!element) return;

    setLoading(true);
    setStatusMsg('PDF 보고서를 생성 중입니다...');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${univName}_${deptName}_AI_분석_보고서.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF 생성 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleGenerateFinalReport = async () => {
    setGeneratingFinal(true);
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    try {
      let acadRecords = [];
      let activityRecords = [];

      if (isMock) {
        acadRecords = JSON.parse(localStorage.getItem('mock_academic_records') || '[]');
        activityRecords = JSON.parse(localStorage.getItem('mock_activities') || '[]');
      } else {
        const { data: a } = await supabase.from('academic_records').select('*').eq('student_id', user?.id);
        const { data: ac } = await supabase.from('activities').select('*').eq('student_id', user?.id);
        acadRecords = a || [];
        activityRecords = ac || [];
      }

      const inputData = {
        profile: {
          name: profile?.name || '학생',
          career_wish: profile?.career_wish || 'IT 공학자'
        },
        academic: acadRecords.map((r: any) => ({
          grade: r.grade,
          semester: r.semester,
          subject_name: r.subject_name,
          rank_rating: r.rank_rating,
          credit_units: r.credit_units
        })),
        activities: activityRecords.map((ac: any) => ({
          id: ac.id,
          grade: ac.grade,
          semester: ac.semester,
          activity_type: ac.activity_type,
          title: ac.title,
          content: ac.content,
          reflection: ac.reflection
        }))
      };

      const result = await generateFinalAdmissionReport(inputData, univName, deptName);
      setFinalReportData(result);
      setActivities(activityRecords);
      setSelectedHighlightIds(result.recommended_activity_ids);
    } catch (err: any) {
      if (!handleOauthBypassError(err)) {
        console.error(err);
        alert('최종 입시 정리 생성에 실패했습니다.');
      }
    } finally {
      setGeneratingFinal(false);
    }
  };

  const handleExportFinalReportPDF = async () => {
    const element = document.getElementById('final-dossier-report');
    if (!element) return;

    setLoading(true);
    setStatusMsg('최종 대입 정리 리포트 PDF를 생성 중입니다...');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${profile?.name || '학생'}_대입_최종_입시_정리_보고서.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF 생성 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const fetchUniversityData = async () => {
    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      // Universities Analysis load
      const storedUniv = localStorage.getItem('mock_target_universities');
      if (storedUniv) {
        setTargetUniversities(JSON.parse(storedUniv));
      } else {
        const dummyUniv: TargetUniversity[] = [
          {
            id: 'u1',
            grade: 1,
            semester: 1,
            analyzed_at: '2024-06-25T14:30:00Z',
            university_name: '서울대학교',
            department_name: '컴퓨터공학부',
            admission_guide_summary: '서울대학교 컴퓨터공학부는 수시 일반전형에서 서류평가와 면접을 통해 수학/과학적 학업 역량과 자기주도성을 정성 평가합니다.',
            source_urls: ['https://admission.snu.ac.kr'],
            ai_analysis_result: {
              match_score: 72,
              strengths: ['수학Ⅰ 내신 등급 우수 (1등급)', '컴퓨터 알고리즘 동아리 내 Pygame 프로젝트 개발을 통해 자기주도성 입증'],
              weaknesses: ['과학 탐구 교과의 원점수 편차가 큰 편', '독서 카테고리에 인공지능 관련 최신 논문 등의 연계 탐구가 다소 부족'],
              recommendations: ['2학년 때 물리학Ⅰ, 화학Ⅰ 이수 및 실험 중심 수행평가 진행 권장', '수학 심화(미적분/기하) 선이수 및 최상위 등급 유지 필수', '독서 기록에 알고리즘 심화 도서 1권 추가 작성'],
              analysis_text: '서울대학교 인재상인 창의적 융합 학업 소양을 증명하기 위한 1학년 기초 설계 단계에 진입하였습니다. 전반적인 내신과 자율 동아리는 우수하나, 정량 성취 중 과학 파트의 보완이 제안됩니다.'
            }
          },
          {
            id: 'u2',
            grade: 1,
            semester: 2,
            analyzed_at: '2024-12-20T10:15:00Z',
            university_name: '서울대학교',
            department_name: '컴퓨터공학부',
            admission_guide_summary: '서울대학교 컴퓨터공학부는 수학/과학 역량을 최우선시하여 서류와 심층 구술 면접을 통해 최종 선발합니다.',
            source_urls: ['https://admission.snu.ac.kr'],
            ai_analysis_result: {
              match_score: 80,
              strengths: ['내신 수학Ⅱ 등급(2등급) 및 영어 1등급 달성으로 전공 기초 체력 향상', '아두이노 하드웨어/임베디드 스마트 홈 프로젝트 동아리 주도로 창의성 어필'],
              weaknesses: ['자율 탐구 프로젝트 내 수학적 논리 연계가 아직은 직관적인 수준에 머묾'],
              recommendations: ['2학년 1학기 정보 또는 프로그래밍 교과를 이수하며 성적 어필', '세특에 알고리즘 시간 복잡도(O-notation)에 대한 이산수학적 증명 내용 기재'],
              analysis_text: '1학년 2학기 말 분석 결과, 1학기 대비 텀블러 캠페인 및 아두이노 프로젝트 등 다채로운 융합 활동이 축적되며 일치도 점수가 80점으로 상승했습니다. 2학년 과정에 심화 수리 공학적 전개가 관건이 될 것입니다.'
            }
          },
          {
            id: 'u3',
            grade: 1,
            semester: 1,
            analyzed_at: '2024-06-26T16:00:00Z',
            university_name: '연세대학교',
            department_name: '컴퓨터과학과',
            admission_guide_summary: '연세대학교 컴퓨터과학과는 학생부종합(활동우수형) 서류 평가 및 제시문 면접을 통해 문제 해결력과 논리적 사고력을 평가합니다.',
            source_urls: ['https://admission.yonsei.ac.kr'],
            ai_analysis_result: {
              match_score: 75,
              strengths: ['수학 및 과학 등 이수단위 가중 과목의 등급 관리가 균형 잡혀 있음', '동아리에서 이진 탐색 시뮬레이션 개발 경험으로 코딩 실무 역량 보유'],
              weaknesses: ['제시문 면접 대비를 위한 논리적 정렬 및 증명 구조의 세특 묘사가 부족함'],
              recommendations: ['수학 및 정보 교과 세특에 단순 코딩 구현을 넘어 알고리즘 정당성 증명 과정을 작성할 것', '학교 융합 과학 대회 등의 탐구 세션 참여 권장'],
              analysis_text: '연세대학교 활동우수형 기준, 수학 성취도가 돋보입니다. 다만 IT 도구의 실제 활용을 넘어서는 공학적 수리 이론 증명 활동이 생기부 후반부에 반영될 필요가 있습니다.'
            }
          }
        ];
        localStorage.setItem('mock_target_universities', JSON.stringify(dummyUniv));
        setTargetUniversities(dummyUniv);
      }

      // Career Goal history load
      const storedGoals = localStorage.getItem('mock_career_goal_history');
      if (storedGoals) {
        setCareerGoals(JSON.parse(storedGoals));
      } else {
        const dummyGoals: CareerGoal[] = [
          {
            id: 'cg1',
            grade: 1,
            semester: 1,
            changed_date: '2024-03-10',
            university_name: '서울대학교',
            department_name: '컴퓨터공학부',
            priority: 1,
            change_reason: '소프트웨어 개발과 인공지능 연구원 진로 도전을 위해 1지망 최상위 목표 설정',
            is_current: true
          },
          {
            id: 'cg2',
            grade: 1,
            semester: 1,
            changed_date: '2024-03-10',
            university_name: '연세대학교',
            department_name: '컴퓨터과학과',
            priority: 2,
            change_reason: '전공 역량 특화 커리큘럼 및 IT 인프라 우수',
            is_current: true
          }
        ];
        localStorage.setItem('mock_career_goal_history', JSON.stringify(dummyGoals));
        setCareerGoals(dummyGoals);
      }

      return;
    }

    try {
      const { data: univData } = await supabase.from('target_universities').select('*').eq('student_id', user?.id);
      const { data: goalData } = await supabase.from('career_goal_history').select('*').eq('student_id', user?.id);

      setTargetUniversities(univData || []);
      setCareerGoals(goalData || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUniversityData();
  }, [user]);

  useEffect(() => {
    if (subTab === 'branding' && !brandingData) {
      handleGenerateBranding();
    }
  }, [subTab]);

  // --- AI 진학 분석 & 검색 실행 ---
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!univName || !deptName) return;

    setLoading(true);
    setCurrentAnalysis(null);
    setCurrentSearchDocs([]);

    try {
      // 1. Web Search
      setStatusMsg('대학 입학처 수시모집 요강 및 인재상을 웹 검색 중입니다...');
      const searchRes = await searchUniversityAdmission(univName, deptName);
      setCurrentSearchDocs(searchRes.search_results);

      // 2. Prepare student data from db/local
      setStatusMsg('생활기록부 및 성적 데이터를 추출하여 분석 프롬프트를 조립 중입니다...');
      const isMock = localStorage.getItem('mock_user_active') === 'true';
      
      let acadRecords = [];
      let mockRecords = [];
      let activityRecords = [];

      if (isMock) {
        acadRecords = JSON.parse(localStorage.getItem('mock_academic_records') || '[]');
        mockRecords = JSON.parse(localStorage.getItem('mock_exam_records') || '[]');
        activityRecords = JSON.parse(localStorage.getItem('mock_activities') || '[]');
      } else {
        const { data: a } = await supabase.from('academic_records').select('*').eq('student_id', user?.id);
        const { data: m } = await supabase.from('mock_exam_records').select('*').eq('student_id', user?.id);
        const { data: ac } = await supabase.from('activities').select('*').eq('student_id', user?.id);
        acadRecords = a || [];
        mockRecords = m || [];
        activityRecords = ac || [];
      }

      const analysisInput = {
        profile: {
          name: profile?.name || '학생',
          career_wish: profile?.career_wish || 'IT 공학자',
          memo: profile?.memo
        },
        academic: acadRecords.map((r: any) => ({
          grade: r.grade,
          semester: r.semester,
          subject_name: r.subject_name,
          rank_rating: r.rank_rating,
          credit_units: r.credit_units
        })),
        mockExams: mockRecords.map((m: any) => ({
          grade: m.grade,
          exam_name: m.exam_name,
          average_grade: m.average_grade
        })),
        activities: activityRecords.map((ac: any) => ({
          grade: ac.grade,
          semester: ac.semester,
          activity_type: ac.activity_type,
          title: ac.title,
          content: ac.content,
          reflection: ac.reflection
        }))
      };

      // 3. Gemini Analysis
      setStatusMsg('Gemini AI가 목표 전형 인재상 일치도와 보완 전략을 분석하고 있습니다...');
      const aiResult = await analyzeUniversityMatch(
        analysisInput,
        univName,
        deptName,
        searchRes.guide_summary
      );

      setCurrentAnalysis(aiResult);

      // 4. Save to target_universities DB
      const newUnivRecord = {
        grade: activeGrade,
        semester: activeSemester,
        analyzed_at: new Date().toISOString(),
        university_name: univName,
        department_name: deptName,
        admission_guide_summary: searchRes.guide_summary,
        source_urls: searchRes.source_urls,
        ai_analysis_result: aiResult
      };

      if (isMock) {
        const updated = [...targetUniversities, { ...newUnivRecord, id: 'univ-' + Date.now() }];
        localStorage.setItem('mock_target_universities', JSON.stringify(updated));
        setTargetUniversities(updated);
      } else {
        const { error } = await supabase
          .from('target_universities')
          .insert([{ ...newUnivRecord, student_id: user?.id }]);
        if (error) throw error;
        await fetchUniversityData();
      }

      setStatusMsg('');
    } catch (err: any) {
      if (!handleOauthBypassError(err)) {
        console.error(err);
        alert('분석 도중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOauthBypassError = (err: any) => {
    if (err.message && err.message.includes('Google OAuth Login Required')) {
      setOauthError(true);
      return true;
    }
    return false;
  };


  // --- 희망 목표 대학 추가 (career_goal_history) ---
  const handleAddCareerGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalReason) return;

    const newGoal = {
      grade: activeGrade,
      semester: activeSemester,
      changed_date: new Date().toISOString().split('T')[0],
      university_name: univName,
      department_name: deptName,
      priority: 1,
      change_reason: goalReason,
      is_current: true
    };

    const isMock = localStorage.getItem('mock_user_active') === 'true';

    if (isMock) {
      // Mark old goal as not current
      const updatedGoals = careerGoals.map((g) => ({ ...g, is_current: false }));
      const finalGoals = [...updatedGoals, { ...newGoal, id: 'cg-' + Date.now() }];
      localStorage.setItem('mock_career_goal_history', JSON.stringify(finalGoals));
      setCareerGoals(finalGoals);
      setGoalReason('');
      alert('목표 대학으로 지정되었습니다.');
      return;
    }

    try {
      // 1. Mark previous current goals as false
      await supabase
        .from('career_goal_history')
        .update({ is_current: false })
        .eq('student_id', user?.id);

      // 2. Insert new goal
      const { error } = await supabase
        .from('career_goal_history')
        .insert([{ ...newGoal, student_id: user?.id }]);
      if (error) throw error;

      // 3. Update student profile career wish summary
      await supabase
        .from('student_profile')
        .update({ career_wish: `${univName} ${deptName}` })
        .eq('id', user?.id);

      await fetchUniversityData();
      setGoalReason('');
      alert('목표 대학으로 지정되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  // --- 履歴 비교를 위한 데이터 연산 ---
  // 특정 대학/학과에 속하는 히스토리 목록
  const getUniqueCompareUnivs = () => {
    const list: string[] = [];
    targetUniversities.forEach((u) => {
      const key = `${u.university_name} - ${u.department_name}`;
      if (!list.includes(key)) list.push(key);
    });
    return list;
  };

  const [selectedHistoryUniv, setSelectedHistoryUniv] = useState<string>('');
  const historyUnivs = getUniqueCompareUnivs();

  useEffect(() => {
    if (historyUnivs.length > 0 && !selectedHistoryUniv) {
      setSelectedHistoryUniv(historyUnivs[0]);
    }
  }, [targetUniversities]);

  const getHistoryList = () => {
    if (!selectedHistoryUniv) return [];
    const [univ, dept] = selectedHistoryUniv.split(' - ');
    return targetUniversities
      .filter((u) => u.university_name === univ && u.department_name === dept)
      .sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime());
  };

  const historyList = getHistoryList();

  useEffect(() => {
    if (historyList.length >= 2) {
      setCompareIdA(historyList[0].id);
      setCompareIdB(historyList[historyList.length - 1].id);
    } else {
      setCompareIdA('');
      setCompareIdB('');
    }
  }, [selectedHistoryUniv, targetUniversities]);

  return (
    <div className="space-y-8">
      {/* Sub tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/40">
        <button
          onClick={() => setSubTab('analyze')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'analyze'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          신규 AI 분석
        </button>
        <button
          onClick={() => setSubTab('recommend')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'recommend'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          AI 맞춤 대학 추천
        </button>
        <button
          onClick={() => setSubTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'history'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          분석 履歴 비교
        </button>
        <button
          onClick={() => setSubTab('compare')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'compare'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          대학 간 다차원 비교
        </button>

        <button
          onClick={() => setSubTab('finalReport')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'finalReport'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-600" />
          3개년 최종 입시 정리
        </button>

        <button
          onClick={() => setSubTab('branding')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'branding'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
          나만의 퍼스널 브랜딩
        </button>
      </div>

      {oauthError && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-2xl mb-6 shadow-sm flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
          <h3 className="text-lg font-bold text-rose-900 mb-2">Google Gemini Advanced 연결 필요</h3>
          <p className="text-rose-700 text-sm mb-4">
            AI 분석을 사용하려면 구글 계정으로 로그인하여 API 권한을 승인해야 합니다. <br/>
            (백엔드 서버의 OAuth 인증 연동)
          </p>
          <button
            onClick={handleOAuthLogin}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            Google 계정으로 계속하기
          </button>
        </div>
      )}

      {subTab === 'analyze' ? (
        // ------------------ 1. 신규 분석 탭 ------------------
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
          {/* 입력 패널 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-fit">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="w-4.5 h-4.5 text-brand-600" />
              진학 대학 검색
            </h4>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">대학교명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 서울대학교, 연세대학교"
                  value={univName}
                  onChange={(e) => setUnivName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">지원 희망 학과명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 컴퓨터공학부, 의예과, 경영학과"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>합격 가능성 및 보완전략 분석</span>
                  </>
                )}
              </button>
            </form>

            {/* AI 분석 후 목표 대학/학과 지정 폼 */}
            {currentAnalysis && (
              <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in duration-350">
                <h5 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-red-500 animate-bounce" />
                  현재 분석 대학을 1순위 목표로 지정
                </h5>
                <form onSubmit={handleAddCareerGoal} className="space-y-3">
                  <textarea
                    required
                    placeholder="목표 대학을 갱신하는 이유(계기)를 기록해주세요."
                    value={goalReason}
                    onChange={(e) => setGoalReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] outline-none h-16 resize-none"
                  />
                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-xl text-[11px] font-bold shadow-sm"
                  >
                    1순위 목표 대학으로 등록
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 결과 디스플레이 패널 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm lg:col-span-2 min-h-[400px] flex flex-col justify-between">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-800 mt-4">진학 분석 엔진 작동 중...</p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{statusMsg}</p>
              </div>
            ) : currentAnalysis ? (
              // 분석 결과 표출
              <div id="analysis-report-card" className="space-y-6 animate-in fade-in duration-300 p-4">
                {/* 점수 요약 헤더 */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800">
                      {univName} {deptName} 분석 리포트
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      기준 시점: {activeGrade}학년 {activeSemester}학기 (누적 데이터 기반)
                    </p>
                  </div>
                  
                  {/* Score & PDF Export Button */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleExportPDF}
                      className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-brand-900/10 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      PDF 저장
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400">인재상 매칭도</p>
                        <p className="text-[11px] text-brand-600 font-extrabold">적합 수준</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                        <span className="text-sm font-black text-brand-700">{currentAnalysis.match_score}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI 종합 평가 */}
                <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl">
                  <h5 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Gemini AI 종합 진단
                  </h5>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                    {currentAnalysis.analysis_text}
                  </p>
                </div>

                {/* 강점 & 약점 양방 분할 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-50/10 border border-emerald-100 rounded-2xl p-4.5">
                    <h6 className="text-xs font-bold text-emerald-700 mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      나의 경쟁력 (강점)
                    </h6>
                    <ul className="space-y-2 text-[11px] text-slate-600 font-medium list-disc pl-4 leading-relaxed">
                      {currentAnalysis.strengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-50/10 border border-red-100 rounded-2xl p-4.5">
                    <h6 className="text-xs font-bold text-red-600 mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      보완이 시급한 영역 (약점)
                    </h6>
                    <ul className="space-y-2 text-[11px] text-slate-600 font-medium list-disc pl-4 leading-relaxed">
                      {currentAnalysis.weaknesses.map((weak, idx) => (
                        <li key={idx}>{weak}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 남은 학기 맞춤 보완 제안 */}
                <div className="bg-brand-50/10 border border-brand-100/30 rounded-2xl p-5">
                  <h6 className="text-xs font-bold text-brand-700 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-brand-500 animate-pulse" />
                    남은 기간 구체적 행동 강령 전략 제안
                  </h6>
                  <ol className="space-y-3 text-xs text-slate-700 font-semibold list-decimal pl-4.5 leading-relaxed">
                    {currentAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="pl-1">{rec}</li>
                    ))}
                  </ol>
                </div>

                {/* 수집된 웹 입학 정보 출처 카드 */}
                {currentSearchDocs.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <LinkIcon className="w-3.5 h-3.5" />
                      웹 검색으로 발췌한 입학처 공식 출처 및 연계 자료
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {currentSearchDocs.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm p-3 rounded-xl transition-all block overflow-hidden"
                        >
                          <p className="text-[10px] font-bold text-slate-800 truncate">{doc.title}</p>
                          <p className="text-[9px] text-slate-400 mt-1 truncate">{doc.source}</p>
                          <p className="text-[8px] text-brand-600 font-bold mt-1.5 flex items-center gap-0.5">
                            출처 열기
                            <ArrowRight className="w-2 h-2" />
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 빈 화면
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-xs font-bold">분석 결과가 여기에 출력됩니다.</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">대학명과 희망 학과를 기입하여 AI 종합 분석을 가동하십시오.</p>
              </div>
            )}
          </div>
        </div>
      ) : subTab === 'recommend' ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-3xl border border-indigo-100 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
              <Compass className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-black text-indigo-950">AI 기반 대입 맞춤 대학 10선 추천</h3>
            <p className="text-indigo-700/80 text-sm max-w-xl leading-relaxed">
              지금까지 입력된 생기부 데이터(성적, 비교과 활동)를 기반으로<br />
              현재 역량과 가장 잘 맞는 대학교 10곳(상향 3개, 적정 5개, 하향 2개)을 추천해 드립니다.
            </p>
            <button
              onClick={handleGenerateRecommendations}
              disabled={generatingRecommendations}
              className="mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingRecommendations ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI 분석 및 추천 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  내 생기부 기반 대학 추천받기
                </>
              )}
            </button>
          </div>

          {recommendations.length > 0 && (
            <div className="mt-8 space-y-8">
              {/* 상향 지원 */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  상향 지원 (도전)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.filter(r => r.type === '상향').map((rec, idx) => (
                    <div key={`reach-${idx}`} className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg">상향</span>
                        <h5 className="font-bold text-slate-800">{rec.university}</h5>
                      </div>
                      <div className="text-sm font-bold text-slate-700 mb-3 pb-3 border-b border-slate-100">
                        {rec.department}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                        {rec.reason}
                      </p>
                      <button 
                        onClick={() => {
                          setUnivName(rec.university);
                          setDeptName(rec.department);
                          setSubTab('analyze');
                        }}
                        className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        상세 분석하기 <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 적정 지원 */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  적정 지원 (가능)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.filter(r => r.type === '적정').map((rec, idx) => (
                    <div key={`target-${idx}`} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg">적정</span>
                        <h5 className="font-bold text-slate-800">{rec.university}</h5>
                      </div>
                      <div className="text-sm font-bold text-slate-700 mb-3 pb-3 border-b border-slate-100">
                        {rec.department}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                        {rec.reason}
                      </p>
                      <button 
                        onClick={() => {
                          setUnivName(rec.university);
                          setDeptName(rec.department);
                          setSubTab('analyze');
                        }}
                        className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        상세 분석하기 <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 하향 지원 */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-blue-600 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  하향 지원 (안정)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.filter(r => r.type === '하향').map((rec, idx) => (
                    <div key={`safety-${idx}`} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg">하향</span>
                        <h5 className="font-bold text-slate-800">{rec.university}</h5>
                      </div>
                      <div className="text-sm font-bold text-slate-700 mb-3 pb-3 border-b border-slate-100">
                        {rec.department}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                        {rec.reason}
                      </p>
                      <button 
                        onClick={() => {
                          setUnivName(rec.university);
                          setDeptName(rec.department);
                          setSubTab('analyze');
                        }}
                        className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        상세 분석하기 <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : subTab === 'history' ? (
        // ------------------ 2. 분석 이력 비교 탭 ------------------
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h4 className="text-sm font-bold text-slate-800">동일 대학/학과 누적 성장 履歴 비교</h4>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">동일 타겟 대학을 반복 분석하여 강약점 및 역량 매칭도 점수 변화 추적</p>
            </div>
            
            {/* Selector */}
            <select
              value={selectedHistoryUniv}
              onChange={(e) => setSelectedHistoryUniv(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              {historyUnivs.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          {historyList.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">분석된 이력이 없습니다. 먼저 신규 분석을 수행하십시오.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 학기별 스코어 그래프 */}
              <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl max-w-2xl">
                <h5 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  학기별 인재상 적합 점수 추이
                </h5>
                <div className="flex items-center gap-6">
                  {historyList.map((hist) => (
                    <div key={hist.id} className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        {hist.grade}학년 {hist.semester}학기
                      </span>
                      <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-sm">
                        <span className="text-base font-black text-brand-600">{hist.ai_analysis_result.match_score}점</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 시점 비교하기 (2개 이상 이력이 있을 때 노출) */}
              {historyList.length >= 2 && (
                <div className="bg-slate-50/60 border border-slate-100 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Layers className="w-4 h-4 text-brand-600" />
                        시점별 정밀 대조 비교 (Split View)
                      </h5>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">두 시점의 진학 리포트를 나란히 열어 성장 및 달라진 전략을 확인합니다.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={compareIdA}
                        onChange={(e) => setCompareIdA(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none"
                      >
                        {historyList.map((hist) => (
                          <option key={hist.id} value={hist.id}>
                            {hist.grade}학년 {hist.semester}학기 ({new Date(hist.analyzed_at).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-bold text-slate-400">vs</span>
                      <select
                        value={compareIdB}
                        onChange={(e) => setCompareIdB(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none"
                      >
                        {historyList.map((hist) => (
                          <option key={hist.id} value={hist.id}>
                            {hist.grade}학년 {hist.semester}학기 ({new Date(hist.analyzed_at).toLocaleDateString()})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setShowCompareSplit(!showCompareSplit)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          showCompareSplit
                            ? 'bg-slate-800 text-white'
                            : 'bg-brand-600 hover:bg-brand-500 text-white'
                        }`}
                      >
                        {showCompareSplit ? '비교 접기' : '좌우 나란히 비교'}
                      </button>
                    </div>
                  </div>

                  {/* 좌우 비교 스플릿 뷰 패널 */}
                  {showCompareSplit && (() => {
                    const docA = historyList.find(h => h.id === compareIdA);
                    const docB = historyList.find(h => h.id === compareIdB);

                    if (!docA || !docB) return null;
                    
                    const scoreDiff = docB.ai_analysis_result.match_score - docA.ai_analysis_result.match_score;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/50 animate-in fade-in slide-in-from-top duration-300">
                        {/* A 시점 분석 */}
                        <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div>
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-200/30">기록 시점 A</span>
                              <h6 className="text-xs font-black text-slate-800 mt-1">{docA.grade}학년 {docA.semester}학기 분석</h6>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                              <span className="text-xs font-black text-slate-700">{docA.ai_analysis_result.match_score}점</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3 text-[11px]">
                            <div>
                              <p className="font-extrabold text-slate-400 mb-1">AI 종합 진단</p>
                              <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-[120px] overflow-y-auto">{docA.ai_analysis_result.analysis_text}</p>
                            </div>
                            <div>
                              <p className="font-extrabold text-emerald-600 mb-1">나의 강점</p>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                                {docA.ai_analysis_result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                            <div>
                              <p className="font-extrabold text-red-500 mb-1">나의 약점</p>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                                {docA.ai_analysis_result.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </div>
                            <div>
                              <p className="font-extrabold text-brand-600 mb-1">보완 제안 전략</p>
                              <ul className="list-decimal pl-4 space-y-1 text-slate-600 font-medium">
                                {docA.ai_analysis_result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* B 시점 분석 */}
                        <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div>
                              <span className="bg-brand-50 text-brand-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-brand-100/30">기록 시점 B</span>
                              <h6 className="text-xs font-black text-slate-800 mt-1">{docB.grade}학년 {docB.semester}학기 분석</h6>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className={`text-[9px] font-black ${scoreDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {scoreDiff >= 0 ? `+${scoreDiff}점 상승` : `${scoreDiff}점 하락`}
                                </span>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                                <span className="text-xs font-black text-brand-700">{docB.ai_analysis_result.match_score}점</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3 text-[11px]">
                            <div>
                              <p className="font-extrabold text-slate-400 mb-1">AI 종합 진단</p>
                              <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-[120px] overflow-y-auto">{docB.ai_analysis_result.analysis_text}</p>
                            </div>
                            <div>
                              <p className="font-extrabold text-emerald-600 mb-1">나의 강점</p>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                                {docB.ai_analysis_result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                            <div>
                              <p className="font-extrabold text-red-500 mb-1">나의 약점</p>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                                {docB.ai_analysis_result.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                              </ul>
                            </div>
                            <div>
                              <p className="font-extrabold text-brand-600 mb-1">보완 제안 전략</p>
                              <ul className="list-decimal pl-4 space-y-1 text-slate-600 font-medium">
                                {docB.ai_analysis_result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 시계열 요약 리스트 */}
              <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                {historyList.map((hist) => {
                  // Find if a goal change marker matches this grade/semester
                  const matchedGoal = careerGoals.find(
                    (cg) => cg.grade === hist.grade && cg.semester === hist.semester && cg.university_name === hist.university_name
                  );

                  return (
                    <div key={hist.id} className="relative">
                      {/* Timeline Node dot */}
                      <span className="absolute -left-9 top-1.5 w-6 h-6 rounded-full border-4 border-white bg-brand-500 shadow" />

                      <div className="bg-slate-50/20 border border-slate-100 p-4.5 rounded-2xl max-w-4xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-bold text-slate-800">
                            {hist.grade}학년 {hist.semester}학기 분석 결과
                          </h5>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {new Date(hist.analyzed_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* If matched career goal transition */}
                        {matchedGoal && (
                          <div className="mb-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            <span>[목표 전환점] 해당 시점에 {matchedGoal.university_name} 목표 설정 사유: {matchedGoal.change_reason}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">핵심 경쟁력</p>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-semibold">
                              {hist.ai_analysis_result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">핵심 제안 사항</p>
                            <ul className="list-decimal pl-4 space-y-1 text-slate-600 font-semibold">
                              {hist.ai_analysis_result.recommendations.slice(0, 2).map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : subTab === 'compare' ? (
        // ------------------ 3. 여러 대학/학과 스펙 비교 그리드 ------------------
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-200">
          <h4 className="text-sm font-bold text-slate-800 mb-2">목표 대학 간 다차원 스펙 비교</h4>
          <p className="text-[11px] text-slate-400 font-semibold mb-6">분석 완료된 개별 대학교 학과별 지표 및 핵심 솔루션 요약 대조표</p>

          {targetUniversities.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">비교 가능한 대학 데이터가 부족합니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-3">대학 / 학과</th>
                    <th className="pb-3 text-center">매칭 스코어</th>
                    <th className="pb-3">입시 평가 핵심 요약</th>
                    <th className="pb-3">대표 강점</th>
                    <th className="pb-3">대표 보완과제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {targetUniversities.map((uni) => (
                    <tr key={uni.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-3">
                        <div className="font-extrabold text-slate-800">{uni.university_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{uni.department_name}</div>
                      </td>
                      <td className="py-4 text-center">
                        <span className="bg-brand-50 text-brand-600 px-2.5 py-1 rounded-xl text-[10px] font-black">
                          {uni.ai_analysis_result.match_score}점
                        </span>
                      </td>
                      <td className="py-4 text-slate-500 max-w-[220px] truncate" title={uni.admission_guide_summary}>
                        {uni.admission_guide_summary}
                      </td>
                      <td className="py-4 text-slate-600 max-w-[180px] truncate" title={uni.ai_analysis_result.strengths[0]}>
                        {uni.ai_analysis_result.strengths[0] || '-'}
                      </td>
                      <td className="py-4 text-slate-600 max-w-[180px] truncate" title={uni.ai_analysis_result.recommendations[0]}>
                        {uni.ai_analysis_result.recommendations[0] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // ------------------ 4. 3개년 최종 입시 정리 탭 ------------------
        <div className="space-y-6 animate-in fade-in duration-200">
          {!finalReportData ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
                <Award className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-800">3개년 누적 대입 최종 정리 리포트</h4>
                <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                  지금까지 기록한 3개년 내신/모의고사 추이와 5대 핵심 생기부 활동을 총체적으로 결합하여, 자기소개서 소재 정리 및 면접용 핵심 스토리라인을 AI가 가이드 형태로 추출합니다.
                </p>
              </div>

              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/50 text-[11px] text-slate-500 font-semibold text-left space-y-1.5">
                <p className="text-slate-700 font-extrabold">🚨 확인사항:</p>
                <p>- 분석에는 누적된 성적 및 생기부 활동 전체 학년 데이터가 활용됩니다.</p>
                <p>- 자소서를 대필해 주는 기능이 아닌, 본인의 강점 경험을 유기적으로 배치하는 '학생부 기반 핵심 소재 매칭 가이드'입니다.</p>
              </div>

              <button
                onClick={handleGenerateFinalReport}
                disabled={generatingFinal}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-bold text-xs py-3.5 px-6 rounded-2xl shadow transition-all flex items-center justify-center gap-1.5 mx-auto"
              >
                {generatingFinal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>누적 데이터 종합 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>최종 대입 정리 리포트 가동</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            // 리포트 생성 완료 렌더링
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">대입 최종 포트폴리오 소재 선별</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">AI가 선별한 핵심 활동 중 최종 자소서/면접에 기입할 하이라이트 3가지를 직접 선정하세요.</p>
                </div>
                <button
                  onClick={handleExportFinalReportPDF}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  최종 보고서 PDF 다운로드
                </button>
              </div>

              {/* 하이라이트 활동 유저 최종 선택 영역 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4.5 rounded-3xl border border-slate-100">
                {activities.slice(0, 5).map((act: any) => {
                  const isChecked = selectedHighlightIds.includes(act.id);
                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedHighlightIds(selectedHighlightIds.filter(id => id !== act.id));
                        } else {
                          setSelectedHighlightIds([...selectedHighlightIds, act.id]);
                        }
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all bg-white hover:border-brand-300 ${
                        isChecked
                          ? 'border-brand-500 ring-2 ring-brand-100 shadow-sm'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {act.grade}학년-{act.semester}학기 | {act.activity_type}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="w-3.5 h-3.5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-medium leading-relaxed">{act.content}</p>
                    </div>
                  );
                })}
              </div>

              {/* A4 인쇄용 Report Card */}
              <div
                id="final-dossier-report"
                className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-sm space-y-8 max-w-4xl mx-auto text-slate-800"
              >
                {/* 보고서 대가리 */}
                <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1.5">
                  <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    대입 수시/면접 대비 3개년 최종 입시 정리 보고서
                  </h2>
                  <p className="text-xs font-bold text-slate-500">
                    학생명: {profile?.name || '학생'} | 희망 진로: {profile?.career_wish} | 목표: {univName} {deptName}
                  </p>
                </div>

                {/* 1) 3개년 성적 요약표 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 border-l-4 border-slate-900 pl-2">
                    [1] 3개년 내신/모의고사 성적 추이 요약
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border border-slate-200 text-[11px] font-semibold">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                          <th className="p-2">성적 부문</th>
                          <th className="p-2 text-center">1학년 1학기</th>
                          <th className="p-2 text-center">1학년 2학기</th>
                          <th className="p-2 text-center">2학년 1학기</th>
                          <th className="p-2 text-center">2학년 2학기</th>
                          <th className="p-2 text-center">3학년 1학기</th>
                          <th className="p-2 text-center">3학년 2학기</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 font-bold bg-slate-50/50">내신 가중 평점 (GPA)</td>
                          {[
                            { g: 1, s: 1 },
                            { g: 1, s: 2 },
                            { g: 2, s: 1 },
                            { g: 2, s: 2 },
                            { g: 3, s: 1 },
                            { g: 3, s: 2 }
                          ].map((_sem: any, idx: number) => {
                            return (
                              <td key={idx} className="p-2 text-center">
                                {idx === 0 ? '1.83' : idx === 1 ? '1.58' : idx === 2 ? '1.83' : '-'} 등급
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-50/50">모의고사 평균 등급</td>
                          <td className="p-2 text-center">1.80 등급</td>
                          <td className="p-2 text-center">1.50 등급</td>
                          <td className="p-2 text-center">1.40 등급</td>
                          <td className="p-2 text-center">1.30 등급</td>
                          <td className="p-2 text-center">-</td>
                          <td className="p-2 text-center">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2) 학년별 핵심 생기부 활동 하이라이트 (선택된 것만 렌더링) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 border-l-4 border-slate-900 pl-2">
                    [2] 최종 선별 3개년 핵심 활동 하이라이트
                  </h4>
                  {selectedHighlightIds.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">상단 카드에서 최종 기재용 핵심 활동을 선별하여 추가해 주세요.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {activities
                        .filter((a: any) => selectedHighlightIds.includes(a.id))
                        .map((act: any) => (
                          <div key={act.id} className="border border-slate-100 p-3 rounded-xl bg-slate-50/40 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-500 text-[10px] mb-1">
                              <span>{act.grade}학년-{act.semester}학기 | {act.activity_type}</span>
                              {act.related_book && <span>📖 독서 연계: {act.related_book}</span>}
                            </div>
                            <p className="font-extrabold text-slate-800 text-[11px]">{act.title}</p>
                            <p className="text-slate-600 mt-1 leading-relaxed font-semibold">{act.content}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* 3) 자기소개서 스토리 라인 소재 배치표 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 border-l-4 border-slate-900 pl-2">
                    [3] 대입 자기소개서 문항별 추천 소재 및 작성 방향 가이드
                  </h4>
                  <div className="space-y-4">
                    {finalReportData.essay_materials.map((ess: any, idx: number) => (
                      <div key={idx} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                        <p className="font-extrabold text-brand-700 text-[10px] uppercase tracking-wider mb-1">
                          {ess.question_type}
                        </p>
                        <p className="font-black text-slate-800 text-[11px] mb-1.5">
                          추천 핵심 소재: {ess.recommended_title}
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium pl-1">
                          {ess.writing_guide}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4) 면접 구술 예상 꼬리 질문집 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-900 border-l-4 border-slate-900 pl-2">
                    [4] 생기부 기재 사실 기반 꼬리 질문 대비 면접 가이드
                  </h4>
                  <div className="space-y-4">
                    {finalReportData.interview_preps.map((inter: any, idx: number) => (
                      <div key={idx} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                        <p className="font-extrabold text-slate-500 text-[9px] uppercase tracking-wider mb-1">
                          연계 기재 사실: {inter.related_activity_title}
                        </p>
                        <p className="font-black text-slate-800 text-[11px] mb-1.5">
                          Q. {inter.question}
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium pl-2 border-l border-brand-300">
                          <span className="font-bold text-brand-700 block text-[10px] mb-0.5">답변 설계 핵심 로직:</span>
                          {inter.answer_structure_tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer disclaimer */}
                <div className="text-center pt-4 border-t border-slate-100 text-[9px] text-slate-400 font-bold italic">
                  ※ 본 보고서는 학생의 누적 학생부 정보를 바탕으로 한 스토리라인 설계표입니다. 공식 제출 자소서/면접 전략 수립 시에는 학교 선생님 및 대학 입학처의 세부 지침을 필히 확인하시기 바랍니다.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'branding' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-800">✨ AI 학생부 퍼스널 브랜딩 컨셉 컨설턴트</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                누적된 생기부 활동과 진로 희망 데이터를 바탕으로, 입학사정관을 매료시킬 학생만의 독자적인 핵심 브랜딩 컨셉 3가지와 자소서/면접용 추천 스토리라인을 제안합니다.
              </p>
            </div>
            {brandingData && (
              <button
                onClick={handleGenerateBranding}
                disabled={generatingBranding}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                컨셉 재분석 실행
              </button>
            )}
          </div>

          {generatingBranding ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-800">3개년 누적 학생부 데이터 종합 분석 중...</p>
              <p className="text-[10px] text-slate-400 font-semibold">학생만을 위한 독자적인 융합 키워드를 도출하고 있습니다. 잠시만 기다려 주십시오.</p>
            </div>
          ) : !brandingData ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 text-2xl font-black shadow-inner">
                🔮
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">나만의 컨셉 브랜딩 분석을 시작하십시오</p>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  생기부 활동 및 진로 히스토리 데이터 전체를 융합하여 핵심 컨셉 키워드를 분석합니다.
                </p>
              </div>
              <button
                onClick={handleGenerateBranding}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-900/10 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                AI 퍼스널 브랜딩 분석 시작
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* 핵심 브랜딩 키워드 3개 가로 그리드 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {brandingData.branding_keywords.map((b: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-slate-900 via-indigo-950/95 to-slate-900 text-white rounded-3xl p-6 border border-indigo-900/30 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-300" />
                    
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">나만의 컨셉 키워드</span>
                      </div>
                      
                      <h4 className="text-xs font-black text-white leading-relaxed min-h-12 border-b border-indigo-950 pb-2.5">
                        "{b.keyword}"
                      </h4>
                      
                      <div className="space-y-2 text-[10.5px] leading-relaxed">
                        <p className="text-slate-300 font-semibold">
                          <span className="text-brand-400 font-black block mb-0.5">🔍 도출 근거 (생기부 분석)</span>
                          {b.reason}
                        </p>
                        <p className="text-slate-400 font-medium">
                          <span className="text-emerald-400 font-black block mb-0.5 mt-2">💡 자소서/면접 스토리라인 가이드</span>
                          {b.storyline}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 하단 융합 총평 가이드 */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-indigo-600" />
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  종합 스토리라인 전개 & 학생부종합전형 전공 적합성 추천
                </h4>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed pl-1 whitespace-pre-line font-medium">
                  {brandingData.synthesis_storyline_guide}
                </p>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
