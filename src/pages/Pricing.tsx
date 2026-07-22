import React, { useState } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useActiveSemester } from '../context/ActiveSemesterContext';
import { Check, ShieldCheck, CreditCard } from 'lucide-react';

// 테스트용 클라이언트 키 (실제 서비스 시 본인의 클라이언트 키로 교체 필요)
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

export const Pricing: React.FC = () => {
  const { user } = useActiveSemester();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    setLoading(true);
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: user.id });
      
      // Toss Payments 빌링(자동결제) 인증 창 호출
      await payment.requestBillingAuth({
        method: 'CARD', // 결제수단 지정
        successUrl: window.location.origin + '/payment/success',
        failUrl: window.location.origin + '/payment/fail',
      });
      // 결제창이 뜨면 브라우저는 리다이렉트 됩니다.
    } catch (err: any) {
      console.error(err);
      alert(err.message || '결제 모듈을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          생기부 마스터 구독 요금제
        </h2>
        <p className="mt-4 text-lg text-slate-500">
          강력한 AI 분석 기능으로 학생들의 진로 지도를 완벽하게 지원하세요.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
        {/* 설명 영역 */}
        <div className="p-8 md:p-10 flex-1 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100">
          <h3 className="text-2xl font-bold text-brand-600 mb-2">프리미엄 구독</h3>
          <p className="text-slate-500 mb-6">생기부 마스터의 모든 AI 기능을 무제한으로 사용하세요.</p>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-center text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
              <span>AI 기반 학기별 생기부 추천 활동 무제한 생성</span>
            </li>
            <li className="flex items-center text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
              <span>목표 대학/학과 맞춤형 퍼스널 브랜딩 설계</span>
            </li>
            <li className="flex items-center text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
              <span>최종 입시 정리 리포트 원클릭 추출 (PDF)</span>
            </li>
            <li className="flex items-center text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
              <span>학생 및 학부모 면담용 비식별 공유 링크 무제한 발급</span>
            </li>
          </ul>

          <div className="flex items-center text-sm text-slate-400">
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            언제든 위약금 없이 해지 가능합니다.
          </div>
        </div>

        {/* 결제 영역 */}
        <div className="p-8 md:p-10 flex-1 flex flex-col justify-center bg-white text-center">
          <div className="mb-2 text-sm font-semibold text-brand-600 tracking-wide uppercase">Monthly Plan</div>
          <div className="flex justify-center items-baseline mb-6">
            <span className="text-5xl font-extrabold text-slate-900">₩29,000</span>
            <span className="text-xl text-slate-500 ml-1">/월</span>
          </div>
          
          <p className="text-slate-500 mb-8 text-sm">
            최초 1회 카드를 등록하시면 매월 자동 결제됩니다.<br/>
            (토스페이먼츠 안전 결제 시스템)
          </p>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-2xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none transition-colors shadow-lg hover:shadow-xl disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                로딩 중...
              </span>
            ) : (
              <span className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                자동결제 카드 등록하기
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
