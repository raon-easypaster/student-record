-- 1. 학생 기본 정보 (student_profile)
create table public.student_profile (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    birth_date date,
    current_grade integer not null check (current_grade in (1, 2, 3)),
    current_class integer,
    career_wish text,
    memo text,
    graduation_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.student_profile enable row level security;

create policy "Users can view own profile" on public.student_profile
    for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.student_profile
    for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.student_profile
    for update using (auth.uid() = id);

-- 2. 내신 성적 (academic_records)
create table public.academic_records (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    semester integer not null check (semester in (1, 2)),
    exam_type text not null check (exam_type in ('중간고사', '기말고사', '학기말고사')),
    subject_name text not null,
    rank_rating integer check (rank_rating between 1 and 9),
    original_score numeric,
    standard_deviation numeric,
    credit_units integer not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.academic_records enable row level security;

create policy "Users can perform all actions on own academic records" on public.academic_records
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 3. 모의고사 성적 (mock_exam_records)
create table public.mock_exam_records (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    exam_date date not null,
    exam_name text not null,
    results jsonb not null,
    average_grade numeric,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mock_exam_records enable row level security;

create policy "Users can perform all actions on own mock exam records" on public.mock_exam_records
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 4. 생기부 활동 (activities)
create table public.activities (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    semester integer not null check (semester in (1, 2)),
    activity_type text not null check (activity_type in ('자율활동', '동아리활동', '진로활동', '세부능력 및 특기사항', '행동특성 및 종합의견')),
    title text not null,
    activity_date date,
    content text not null,
    reflection text,
    subject_name text,
    career_relation text,
    related_book text, -- 2024 기재요령 대응: 교과/진로 탐구 내 독서 연계 기록용
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.activities enable row level security;

create policy "Users can perform all actions on own activities" on public.activities
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 5. 희망 진로/대학/학과 변경 이력 (career_goal_history)
create table public.career_goal_history (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    semester integer not null check (semester in (1, 2)),
    changed_date date not null default current_date,
    university_name text not null,
    department_name text not null,
    priority integer not null default 1,
    change_reason text,
    is_current boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.career_goal_history enable row level security;

create policy "Users can perform all actions on own career goals" on public.career_goal_history
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 6. 참고 자료 보관함 (reference_materials)
create table public.reference_materials (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    semester integer not null check (semester in (1, 2)),
    material_type text not null check (material_type in ('file', 'link', 'youtube')),
    title text not null,
    url text,
    file_path text,
    file_size bigint,
    summary text,
    user_memo text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reference_materials enable row level security;

create policy "Users can perform all actions on own reference materials" on public.reference_materials
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 6-1. 참고 자료 관계 연결 테이블 (material_connections)
create table public.material_connections (
    id uuid default gen_random_uuid() primary key,
    material_id uuid references public.reference_materials(id) on delete cascade not null,
    connected_type text not null check (connected_type in ('activity', 'target_university')),
    connected_id uuid not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.material_connections enable row level security;

create policy "Users can manage own connections" on public.material_connections
    for all using (
        exists (
            select 1 from public.reference_materials m
            where m.id = material_id and m.student_id = auth.uid()
        )
    );

-- 7. 희망 대학/학과 분석 결과 (target_universities)
create table public.target_universities (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    semester integer not null check (semester in (1, 2)),
    analyzed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    university_name text not null,
    department_name text not null,
    admission_guide_summary text,
    source_urls text[] not null default '{}'::text[],
    ai_analysis_result jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.target_universities enable row level security;

create policy "Users can perform all actions on own target universities" on public.target_universities
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 8. 학기별 목표 달성 체크리스트 (goal_checkpoints)
create table public.goal_checkpoints (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references auth.users on delete cascade not null,
    grade integer not null check (grade in (1, 2, 3)),
    semester integer not null check (semester in (1, 2)),
    content text not null,
    target_date date,
    status text not null check (status in ('진행중', '달성', '미달성')) default '진행중',
    reflection text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.goal_checkpoints enable row level security;

create policy "Users can perform all actions on own checkpoints" on public.goal_checkpoints
    for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- 9. Storage 버킷 설정 및 RLS 정책
-- 버킷생성은 콘솔 혹은 API로 진행하며, 본 SQL 파일은 RLS 정책 매핑용입니다.
-- 버킷 이름: reference-materials

create policy "Allow authenticated users upload to own folder" on storage.objects
    for insert with check (
        bucket_id = 'reference-materials' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Allow authenticated users read own folder" on storage.objects
    for select using (
        bucket_id = 'reference-materials' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Allow authenticated users delete own folder" on storage.objects
    for delete using (
        bucket_id = 'reference-materials' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );
