-- ============================================================
-- 가입 시 이메일 확인 없이 student_profile을 생성하는 SECURITY DEFINER 함수
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 기존 함수가 있으면 삭제
DROP FUNCTION IF EXISTS public.create_student_profile_on_signup(uuid, text, text, date, integer, text, date);

-- SECURITY DEFINER 함수 생성 (RLS 우회 가능)
CREATE OR REPLACE FUNCTION public.create_student_profile_on_signup(
  p_id uuid,
  p_name text,
  p_email text,
  p_birth_date date,
  p_current_grade integer,
  p_career_wish text,
  p_graduation_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_approve boolean;
  v_result json;
BEGIN
  -- 관리자 이메일은 자동 승인
  v_auto_approve := (p_email = 'admin@naver.com' OR p_email = 'galeb76@naver.com');
  
  -- 기존 프로필이 있으면 덮어쓰지 않음 (중복 가입 방지)
  IF EXISTS (SELECT 1 FROM public.student_profile WHERE id = p_id) THEN
    RETURN json_build_object('success', false, 'message', '이미 프로필이 존재합니다.');
  END IF;

  -- 프로필 삽입 (RLS 우회)
  INSERT INTO public.student_profile (
    id, name, email, birth_date, current_grade,
    career_wish, graduation_date, is_approved, is_admin
  )
  VALUES (
    p_id, p_name, p_email, p_birth_date, p_current_grade,
    p_career_wish, p_graduation_date, v_auto_approve, v_auto_approve
  );

  RETURN json_build_object('success', true, 'is_approved', v_auto_approve);
END;
$$;

-- 익명 사용자(anon)와 인증된 사용자(authenticated) 모두에게 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.create_student_profile_on_signup TO anon;
GRANT EXECUTE ON FUNCTION public.create_student_profile_on_signup TO authenticated;
