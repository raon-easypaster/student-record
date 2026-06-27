-- ============================================================
-- 관리자 우회 로그인(anon) 상태에서도 가입 승인/거절을 처리하기 위한 RPC 함수들
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. 대기 중인 사용자 목록 조회 (RLS 우회)
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS SETOF public.student_profile
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.student_profile WHERE is_approved = false ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_users() TO anon;
GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated;

-- 2. 가입 승인 처리 (RLS 우회)
CREATE OR REPLACE FUNCTION public.approve_student_profile(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_profile SET is_approved = true, is_admin = false WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_student_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.approve_student_profile(uuid) TO authenticated;

-- 3. 가입 거절(삭제) 처리 (RLS 우회)
CREATE OR REPLACE FUNCTION public.reject_student_profile(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.student_profile WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_student_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.reject_student_profile(uuid) TO authenticated;
