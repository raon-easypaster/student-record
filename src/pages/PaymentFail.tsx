import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export const PaymentFail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center border border-slate-100/60">
        <XCircle className="w-16 h-16 text-rose-500 mb-4 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">결제 실패</h2>
        <p className="text-slate-500 mb-2">카드 등록 중 오류가 발생했습니다.</p>
        
        {message && (
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 mb-6 text-left">
            <strong>사유:</strong> {message} {code && `(${code})`}
          </div>
        )}

        <button
          onClick={() => navigate('/pricing')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
        >
          다시 시도하기
        </button>
      </div>
    </div>
  );
};
