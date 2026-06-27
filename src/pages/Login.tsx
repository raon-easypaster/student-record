import React, { useState } from 'react';
import { supabase, isMockServer } from '../services/supabase';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [birthYear, setBirthYear] = useState<number>(2010);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthDay, setBirthDay] = useState<number>(1);
  const [grade, setGrade] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const { refreshProfile } = useActiveSemester();
  const navigate = useNavigate();

  const isLocalMock = isMockServer;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const targetBirthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    // 마스터 관리자 비밀번호 (raon2018!!) 바이패스 처리
    const isMasterAdmin = (email === 'galeb76@naver.com' || email === 'admin@naver.com') && password === 'raon2018!!';
    if (isLogin && isMasterAdmin) {
      try {
        localStorage.setItem('mock_user_active', 'true');
        localStorage.setItem('mock_student_profile', JSON.stringify({
          id: 'admin-master-session',
          name: '최고 관리자',
          email: email,
          birth_date: '1999-01-01',
          current_grade: 3,
          current_class: 1,
          career_wish: '입시 시스템 총괄 관리자',
          memo: '마스터 관리자 비밀번호로 우회 로그인 성공했습니다.',
          graduation_date: `${new Date().getFullYear()}-02-15`,
          is_approved: true,
          is_admin: true
        }));
        
        if (!isLocalMock) {
          try {
            await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
          } catch (e) {
            console.warn(e);
          }
        }
        
        window.location.href = '/';
        return;
      } catch (err: any) {
        console.error(err);
      }
    }

    if (isLocalMock) {
      try {
        const storedUsers = localStorage.getItem('mock_users');
        const mockUsers = storedUsers ? JSON.parse(storedUsers) : [];

        if (isLogin) {
          // Local login search
          const matched = mockUsers.find((u: any) => u.email === email && u.password === password);
          if (!matched) {
            throw new Error('이메일 또는 비밀번호가 올바르지 않습니다. (로컬 임시 모드)');
          }

          if (!matched.is_approved) {
            throw new Error('아직 승인 대기 중인 계정입니다. 관리자 승인 후 로그인이 가능합니다. (로컬 임시 모드)');
          }

          localStorage.setItem('mock_user_active', 'true');
          localStorage.setItem('mock_student_profile', JSON.stringify({
            id: matched.id,
            name: matched.name,
            email: matched.email,
            birth_date: matched.birthDate || '2008-03-15',
            current_grade: matched.grade,
            current_class: 3,
            career_wish: '소프트웨어 개발자 / AI 연구원',
            memo: '로컬 데이터 모드로 정상 가입 및 로그인되었습니다.',
            graduation_date: `${new Date().getFullYear() + (4 - matched.grade)}-02-15`,
            is_approved: matched.is_approved,
            is_admin: matched.is_admin
          }));
        } else {
          // Local signup register
          if (mockUsers.some((u: any) => u.email === email)) {
            throw new Error('이미 등록된 이메일 주소입니다. (로컬 임시 모드)');
          }

          const autoApprove = email === 'admin@naver.com' || email === 'galeb76@naver.com';
          const newMockUser = {
            id: 'mock-user-' + Date.now(),
            email,
            password,
            name: name || '학생',
            grade: grade || 1,
            birthDate: targetBirthDate,
            is_approved: autoApprove,
            is_admin: autoApprove
          };
          mockUsers.push(newMockUser);
          localStorage.setItem('mock_users', JSON.stringify(mockUsers));

          if (!autoApprove) {
            alert('회원등록이 신청되었습니다! 관리자의 가입 승인 대기 상태입니다.\n(테스트 팁: galeb76@naver.com 또는 admin@naver.com 계정으로 접속하시면 관리자 전용 대시보드 뷰에서 승인이 가능합니다.)');
          } else {
            alert('관리자 계정으로 즉시 가입 및 승인이 완료되었습니다! 로그인을 진행해주세요.');
          }
          setIsLogin(true);
          setLoading(false);
          return;
        }

        // Redirect
        window.location.href = '/';
      } catch (err: any) {
        console.error(err);
        let errMsg = '인증 과정 중 오류가 발생했습니다.';
        if (err) {
          if (typeof err === 'string') {
            errMsg = err;
          } else if (err.message) {
            errMsg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
          } else {
            try {
              errMsg = JSON.stringify(err);
            } catch (e) {
              errMsg = String(err);
            }
          }
        }
        setErrorMsg(errMsg);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (isLogin) {
        // Sign In
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (authData.user) {
          // Check approval status
          const { data: profileData, error: profileErr } = await supabase
            .from('student_profile')
            .select('is_approved')
            .eq('id', authData.user.id)
            .single();

          if (profileErr) throw profileErr;

          if (profileData && !profileData.is_approved) {
            await supabase.auth.signOut();
            throw new Error('아직 승인 대기 중인 계정입니다. 관리자 승인 후 로그인이 가능합니다.');
          }
        }
      } else {
        // Sign Up
        if (isMockServer) {
          throw new Error('Vercel에 Supabase API 환경 변수가 등록되지 않았습니다. 임시 테스트는 하단의 [체험용 데모 계정으로 시작하기]를 클릭해 주십시오.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        // 오류 처리
        if (error) {
          const errCode = (error as any).status ?? (error as any).code ?? '';
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '(env 없음)';
          const rawMsg = JSON.stringify({ status: errCode, message: error.message, url: supabaseUrl.slice(0, 50) });
          if (String(errCode) === '0' || !errCode || String(error.message).toLowerCase().includes('fetch') || String(error.message) === '0') {
            throw new Error(`네트워크 연결 실패 (status:${errCode})\n접속 URL: ${supabaseUrl.slice(0, 60)}\n\n[해결] Vercel > Settings > Environment Variables에서 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인 후 Redeploy 해주십시오.\n\n원본 오류: ${rawMsg}`);
          }
          throw new Error(`인증 오류 (status:${errCode}): ${error.message}`);
        }

        // data.user가 null인 경우 = 이메일 확인 중복 발송 등 (기존 이메일)
        if (!data.user) {
          throw new Error('이미 가입된 이메일이거나 이메일 확인이 필요합니다. 받은 메일함을 확인해 주십시오.');
        }

        // SECURITY DEFINER 함수로 프로필 생성 (RLS 우회 + 이메일 미확인 상태도 처리)
        const { error: rpcError } = await supabase.rpc('create_student_profile_on_signup', {
          p_id: data.user.id,
          p_name: name || '학생',
          p_email: email,
          p_birth_date: targetBirthDate || null,
          p_current_grade: grade,
          p_career_wish: '진로 희망을 작성해주세요.',
          p_graduation_date: `${new Date().getFullYear() + (4 - grade)}-02-15`
        });

        if (rpcError) {
          console.error('RPC 프로필 생성 실패:', rpcError);
          // RPC 함수가 없는 경우 직접 INSERT 시도 (fallback)
          const { error: profileError } = await supabase
            .from('student_profile')
            .insert([{
              id: data.user.id,
              name: name || '학생',
              email: email,
              birth_date: targetBirthDate || null,
              current_grade: grade,
              career_wish: '진로 희망을 작성해주세요.',
              graduation_date: `${new Date().getFullYear() + (4 - grade)}-02-15`,
              is_approved: email === 'admin@naver.com' || email === 'galeb76@naver.com',
              is_admin: email === 'admin@naver.com' || email === 'galeb76@naver.com'
            }]);
          if (profileError) {
            console.error('Fallback INSERT 실패:', profileError);
            throw new Error('학생 프로필 등록에 실패했습니다: ' + profileError.message + '\n\n[해결방법] Supabase SQL Editor에서 signup_function.sql을 실행해 주십시오.');
          }
        }

        const isAutoApproved = email === 'admin@naver.com' || email === 'galeb76@naver.com';
        if (!isAutoApproved) {
          alert('✅ 회원가입 신청이 완료되었습니다!\n관리자 승인 완료 후 로그인이 가능합니다.\n\n(이메일 확인 메일이 발송되었을 수 있습니다.)');
          setIsLogin(true);
          setLoading(false);
          return;
        }
      }

      await refreshProfile();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let errMsg = '인증 과정 중 오류가 발생했습니다.';
      if (err) {
        if (typeof err === 'string') {
          errMsg = err;
        } else if (err.message) {
          errMsg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
        } else if (err.error_description) {
          errMsg = err.error_description;
        } else {
          try {
            errMsg = JSON.stringify(err);
          } catch (e) {
            errMsg = String(err);
          }
        }
      }
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('mock_user_active', 'true');
    const targetBirthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
    // Save a mock profile
    const mockProfile = {
      id: 'mock-user-id',
      name: name || '김대입',
      birth_date: targetBirthDate,
      current_grade: grade,
      current_class: 3,
      career_wish: '소프트웨어 개발자 / AI 연구원',
      memo: '수학과 컴퓨터 공학에 관심이 많음.',
      graduation_date: `${new Date().getFullYear() + (4 - grade)}-02-15`
    };
    localStorage.setItem('mock_student_profile', JSON.stringify(mockProfile));
    
    // Trigger auth refresh
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background grid and glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-brand-600/15 border border-brand-500/20 text-brand-400 p-3 rounded-2xl mb-4 shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">생기부 Master</h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium max-w-sm">
            고교 3개년 학생부(생기부) 통합 관리와 AI 기반 대입 전형 맞춤형 합격 솔루션
          </p>
        </div>

        {/* Supabase 미설정 알림 배너 */}
        {isLocalMock && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4.5 rounded-2xl text-[11px] leading-relaxed font-semibold">
            <p className="font-extrabold text-xs text-amber-400 mb-1">
              ⚠️ 로컬 임시 데이터 모드로 가동 중
            </p>
            현재 Supabase 연동 정보(.env)가 작성되지 않아 **임시 브라우저 로컬 저장소 모드**로 가동합니다.
            입력하신 가입 계정 및 모든 성적/활동 데이터는 **본인 브라우저 내에만 임시 보관**됩니다.
            클라우드 DB 저장을 원하실 시, 프로젝트 루트의 `.env` 파일에 `VITE_SUPABASE_URL` 정보를 올바르게 추가해주십시오.
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl mb-6 border border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isLogin ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              !isLogin ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            학생 정보 등록 (가입)
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/40 rounded-2xl text-red-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Sign Up Fields */}
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">학생 이름</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 text-xs font-medium outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">생년월일</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* 년도 드롭다운 */}
                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 px-3.5 text-slate-200 text-xs font-semibold outline-none transition-all cursor-pointer"
                    >
                      {[2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020].map(y => (
                        <option key={y} value={y} className="bg-slate-900">{y}년</option>
                      ))}
                    </select>

                    {/* 월 드롭다운 */}
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 px-3.5 text-slate-200 text-xs font-semibold outline-none transition-all cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m} className="bg-slate-900">{m}월</option>
                      ))}
                    </select>

                    {/* 일 드롭다운 */}
                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(Number(e.target.value))}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 px-3.5 text-slate-200 text-xs font-semibold outline-none transition-all cursor-pointer"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d} className="bg-slate-900">{d}일</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">현재 학년</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 px-4 text-slate-200 text-xs font-medium outline-none transition-all cursor-pointer"
                  >
                    <option value={1} className="bg-slate-900">1학년 (신입생)</option>
                    <option value={2} className="bg-slate-900">2학년</option>
                    <option value={3} className="bg-slate-900">3학년 (수험생)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email / Password Fields */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">이메일 주소</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@student.com"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 text-xs font-medium outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 text-xs font-medium outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-900/10 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isLogin ? '로그인하기' : '학생 등록 완료'}</span>
              )}
            </button>

            {/* Mock Demo Login Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>체험용 데모 계정으로 시작하기 (즉시 접속)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
