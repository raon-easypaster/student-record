import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Vercel 환경 변수에서 가져오기
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_Z1aOwX7K8m2P90w9YqQO3yQxzvNP';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerKey, authKey } = req.body;

  if (!customerKey || !authKey) {
    return res.status(400).json({ error: 'Missing customerKey or authKey' });
  }

  try {
    // 1. 토스페이먼츠 API로 빌링키 발급 요청
    const tossUrl = 'https://api.tosspayments.com/v1/billing/authorizations/issue';
    const encryptedSecretKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
    
    const tossRes = await fetch(tossUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerKey,
        authKey
      })
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      console.error('Toss Billing Issue Error:', tossData);
      return res.status(tossRes.status).json({ error: tossData.message || '빌링키 발급 실패' });
    }

    const billingKey = tossData.billingKey;
    const cardCompany = tossData.cardCompany;
    const cardNumber = tossData.cardNumber;

    // 2. Supabase 연결 (관리자 권한 서비스 키 사용)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. subscriptions 테이블에 빌링키 저장 (또는 업데이트)
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: customerKey,
        billing_key: billingKey,
        card_company: cardCompany,
        card_number: cardNumber,
        plan_type: 'premium_monthly',
        status: 'active',
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('Supabase subscription upsert error:', subError);
      throw new Error('구독 정보 저장 실패');
    }

    // 4. profiles 테이블의 is_approved를 true로 즉시 변경하여 앱 사용 허가
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', customerKey);

    if (profileError) {
      console.error('Supabase profile update error:', profileError);
      throw new Error('회원 승인 처리 실패');
    }

    // 5. 첫 결제 30,000원 즉시 청구 (선택적)
    // - 만약 카드 등록과 동시에 첫 달 요금을 결제하려면 이 단계에서 /v1/billing API를 호출합니다.
    // - 현재는 발급만 진행합니다.

    return res.status(200).json({ success: true, message: '빌링키 발급 및 승인 완료' });

  } catch (error: any) {
    console.error('Issue billing endpoint error:', error);
    return res.status(500).json({ error: error.message || '서버 내부 오류' });
  }
}
