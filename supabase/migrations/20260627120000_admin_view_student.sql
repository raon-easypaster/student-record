-- 가입 완료된 일반 학생 목록 조회
CREATE OR REPLACE FUNCTION public.get_approved_users()
RETURNS SETOF public.student_profile
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.student_profile WHERE is_approved = true AND is_admin = false ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_users() TO anon;
GRANT EXECUTE ON FUNCTION public.get_approved_users() TO authenticated;

-- 특정 학생의 모든 데이터 한 번에 조회
CREATE OR REPLACE FUNCTION public.get_student_full_data(p_student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile json;
  v_academic json;
  v_mock_exams json;
  v_activities json;
  v_target_univs json;
  v_goals json;
BEGIN
  -- 1. Profile
  SELECT row_to_json(p) INTO v_profile FROM public.student_profile p WHERE id = p_student_id;
  
  -- 2. Academic Records
  SELECT COALESCE(json_agg(row_to_json(a)), '[]') INTO v_academic FROM (
    SELECT * FROM public.academic_records WHERE student_id = p_student_id ORDER BY grade, semester
  ) a;
  
  -- 3. Mock Exams
  SELECT COALESCE(json_agg(row_to_json(m)), '[]') INTO v_mock_exams FROM (
    SELECT * FROM public.mock_exam_records WHERE student_id = p_student_id ORDER BY exam_date DESC
  ) m;
  
  -- 4. Activities
  SELECT COALESCE(json_agg(row_to_json(ac)), '[]') INTO v_activities FROM (
    SELECT * FROM public.activities WHERE student_id = p_student_id ORDER BY created_at DESC
  ) ac;
  
  -- 5. Target Universities
  SELECT COALESCE(json_agg(row_to_json(u)), '[]') INTO v_target_univs FROM (
    SELECT * FROM public.target_universities WHERE student_id = p_student_id ORDER BY created_at DESC
  ) u;

  -- 6. Goals
  SELECT COALESCE(json_agg(row_to_json(g)), '[]') INTO v_goals FROM (
    SELECT * FROM public.career_goal_history WHERE student_id = p_student_id ORDER BY created_at DESC
  ) g;

  RETURN json_build_object(
    'profile', v_profile,
    'academic_records', v_academic,
    'mock_exam_records', v_mock_exams,
    'activities', v_activities,
    'target_universities', v_target_univs,
    'goals', v_goals
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_full_data(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_full_data(uuid) TO authenticated;
