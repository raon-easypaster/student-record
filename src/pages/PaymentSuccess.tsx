import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const customerKey = searchParams.get('customerKey');
  const authKey = searchParams.get('authKey');

  useEffect(() => {
    if (!customerKey || !authKey) {
      setStatus('error');
      setErrorMsg('유효하지 않은 결제 요청입니다.');
      return;
    }

    const issueBillingKey = async () => {
      try {
        const res = await fetch('/api/toss-issue-billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerKey, authKey })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '빌링키 발급 실패');
        
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || '알 수 없는 오류가 발생했습니다.');
      }
    };

    issueBillingKey();
  }, [customerKey, authKey]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center border border-slate-100/60">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">결제 승인 중...</h2>
            <p className="text-slate-500">잠시만 기다려 주세요.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">카드 등록 완료!</h2>
            <p className="text-slate-500 mb-6">
              자동 결제 등록이 완료되었습니다.<br/>이제 생기부 마스터의 모든 기능을 이용하실 수 있습니다.
            </p>
            <button
              onClick={() => {
                // Force a hard reload to refresh the profile.is_approved state from context
                window.location.href = '/';
              }}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              시작하기
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-rose-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">카드 등록 실패</h2>
            <p className="text-slate-500 mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              다시 시도하기
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
