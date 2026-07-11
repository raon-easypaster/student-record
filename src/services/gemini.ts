// For the backend proxy, we will still use the mock generation structure if needed,
// but the actual generation will be routed to http://127.0.0.1:5000/api/generateContent

const backendUrl = 'http://127.0.0.1:5000';

async function generateContentProxy(promptOrParts: any, options: any = {}) {
  try {
    let requestPayload;
    if (typeof promptOrParts === 'string') {
      requestPayload = {
        contents: [{ role: 'user', parts: [{ text: promptOrParts }] }],
        generationConfig: options.generationConfig || {}
      };
    } else if (Array.isArray(promptOrParts)) {
      // Assuming array of parts
      requestPayload = {
        contents: [{ role: 'user', parts: promptOrParts }],
        generationConfig: options.generationConfig || {}
      };
    } else {
      requestPayload = promptOrParts;
    }

    const currentUserId = localStorage.getItem('current_user_id') || 'mock_user';

    const res = await fetch(`${backendUrl}/api/generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId
      },
      body: JSON.stringify(requestPayload)
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Google OAuth Login Required');
      }
      const errorText = await res.text();
      throw new Error(`Backend Proxy Error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    
    // Cloud Code API returns the response wrapped in a "response" object, and we need to unwrap candidates
    const candidates = data.response?.candidates || [];
    if (candidates.length === 0) {
      throw new Error('No candidates returned from proxy');
    }
    
    const textPart = candidates[0].content?.parts?.find((p: any) => p.text);
    const text = textPart ? textPart.text : '';

    return {
      response: {
        text: () => text
      }
    };
  } catch (err: any) {
    if (err.message === 'Google OAuth Login Required') {
      throw err; // Special case to trigger login UI if we want to handle it locally
    }
    throw err;
  }
}

// Keep a dummy genAI object to satisfy existing signature checks before proxy kicks in.
// We'll wrap getGenerativeModel to return an object with generateContent mapped to our proxy.
let genAI: any = {
  getGenerativeModel: (options: any) => ({
    generateContent: (req: any) => generateContentProxy(req, options)
  })
};

// AI Summarization for Library Links
export async function summarizeReferenceMaterial(
  title: string,
  content: string,
  type: 'link' | 'youtube' | 'file'
): Promise<string> {
  if (!genAI) {
    // Return mock summary after a brief delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return `[AI 요약 (데모 모드)] 본 자료는 "${title}"에 관한 내용으로, 고등학교 교육과정 및 학생부 종합전형에서 요구하는 자기주도적 학업 역량과 깊은 관련이 있습니다. 특히 주요 핵심 개념들의 정의와 이를 실제 탐구 활동에 어떻게 적용할 수 있는지에 대한 실용적인 가이드를 제공합니다.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const prompt = `
      다음 자료를 고등학생 생기부 활동 참고용으로 요약해줘.
      자료 유형: ${type}
      제목: ${title}
      본문/설명 내용: ${content}

      요약 조건:
      - 3줄 이내의 명확한 문장으로 요약할 것.
      - 학생부 종합전형(학종) 관점에서 이 자료가 어떤 탐구 활동에 유용할지 한 마디 덧붙여줄 것.
      - 한국어로 작성할 것.
    `;
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini API Error (Summarization):', error);
    return `요약 생성에 실패했습니다. (오류: ${error instanceof Error ? error.message : '알 수 없음'})`;
  }
}

// AI Analysis for Target University Match
export interface StudentAnalysisInput {
  profile: {
    name: string;
    career_wish: string;
    memo?: string;
  };
  academic: Array<{
    grade: number;
    semester: number;
    subject_name: string;
    rank_rating: number | null;
    credit_units: number;
  }>;
  mockExams: Array<{
    grade: number;
    exam_name: string;
    average_grade: number;
  }>;
  activities: Array<{
    grade: number;
    semester: number;
    activity_type: string;
    title: string;
    content: string;
    reflection?: string;
  }>;
}

const DISCLAIMER_TEXT = "\n\n※ 본 AI 분석 및 보완 제안은 학생이 기록한 데이터를 근거로 산출된 참고용 자료입니다. 학년별 교육과정 변동이나 대학 입학처의 당해 연도 최종 수시 요강 변경이 있을 수 있으므로, 최종 판단 시에는 반드시 담임 선생님, 진로 진학 지도 선생님의 조언 및 대학 입학처 공식 안내를 재확인하시기 바랍니다.";

export async function analyzeUniversityMatch(
  studentData: StudentAnalysisInput,
  universityName: string,
  departmentName: string,
  admissionGuideText: string
): Promise<{
  match_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  analysis_text: string;
}> {
  const mockResult = {
    match_score: 78,
    strengths: [
      `희망 진로(${studentData.profile.career_wish})와 연계된 동아리 프로젝트(알고리즘 시각화, 스마트홈 설계 등)의 정성적 서술이 우수하며 주도성이 돋보입니다.`,
      `주요 교과 중 수학 교과군(수학Ⅰ, 수학Ⅱ 등)의 이수단위 가중 평균이 타 과목 대비 우위를 점하고 있습니다.`,
      `교과 세특을 통해 등차/등비수열 합 공식과 알고리즘 반복 연산 횟수를 증명하는 등 수학적 연계 역량을 구체적으로 증명했습니다.`
    ],
    weaknesses: [
      `${universityName} ${departmentName} 입학요강에서 명시한 '과학 탐구 교과 기초 소양'에 비해 통합과학/물리 등의 성취 등급(평균 2-3등급)이 수학에 비해 다소 정체되어 있습니다.`,
      `진로 활동 및 세특 내 학술 탐구 기록에서 전공 연계 심층 도서를 바탕으로 한 자기주도적 독서 연계 키워드가 추가 보완될 여지가 있습니다.`
    ],
    recommendations: [
      `다음 학기 물리학/정보 교과 세특 작성 시, 탐구 도서 [알고리즘 첫걸음]을 활용하여 이진 탐색 코드의 효율성에 관한 추가 증명 보고서를 세특에 녹여내십시오.`,
      `수능 최저기준 충족을 위해 모의고사 평균 등급을 최소 1.5등급 이내로 안정화하는 정량적 성적 관리가 권장됩니다.`,
      `창체 진로활동 내에 대학 입학처 인재상 조건인 '창의적 문제해결력'을 어필하기 위해, 교내 융합 탐구 발표회에서 공학적 분석 기법을 인용한 성과를 발표하십시오.`
    ],
    analysis_text: `[${universityName} ${departmentName}]의 공식 요강 분석 결과, 본 전형에서는 수학/과학 교과 이수 실적과 정성적 탐구 태도를 종합 정성 평가합니다. 학생의 내신 데이터 분석 결과, 수학적 학업 소양은 충분히 입증되었으나 요강이 요구하는 융합 과학(물리/정보 등) 교과 성취도의 기복이 약점으로 작용할 수 있습니다. 2학년 과정 동안 세부능력 및 특기사항에 전공 독서를 연계한 논리적 증명 탐구를 추가 서술하여 보완할 것을 강력히 권장합니다.${DISCLAIMER_TEXT}`
  };

  if (!genAI) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return mockResult;
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      학생의 실제 생활기록부 데이터(내신/모평 성적 및 창체/세특 활동 전체 학년 누적분)와 지원 희망 대학/학과에서 공고한 실제 입시 요강 정보를 토대로, 극도로 구체적인 '근거 기반' 전공 적합성 평가 및 학년별 맞춤형 보완 전략을 제시해줘.

      [학생 기본 정보]
      - 이름: ${studentData.profile.name}
      - 희망 진로: ${studentData.profile.career_wish}
      - 특이 메모: ${studentData.profile.memo || '없음'}

      [학생의 실제 전체 학년 누적 내신 성적]
      ${JSON.stringify(studentData.academic, null, 2)}

      [학생의 실제 모의고사 성적 기록]
      ${JSON.stringify(studentData.mockExams, null, 2)}

      [학생의 실제 생기부 활동 누적 데이터 (5대 핵심 영역)]
      ${JSON.stringify(studentData.activities, null, 2)}

      [지원 희망 대학/학과 및 입학처 요강 정보]
      - 대학교: ${universityName}
      - 모집 학과: ${departmentName}
      - 요강 원문 요약: ${admissionGuideText}

      [분석 가이드라인 - 할루시네이션(거짓 정보 생성) 절대 금지]
      1. 강점 및 약점 도출 시, 학생의 실제 과목명, 등급 수치, 동아리 탐구 명칭 등 제공된 JSON 데이터에 있는 구체적인 텍스트만 명확히 인용할 것. 성적(등급)을 인용할 때는 절대로 반올림하여 정수로 만들지 말고, 소수점이 있다면 원본 데이터에 있는 소수점 수치까지 정확히 명시할 것.
      2. 입력된 성적/활동 데이터가 일부 학기(예: 1학년 중간고사)뿐이거나 2, 3학년 기록이 없는 경우, 절대로 없는 기록이나 과목, 활동을 지어내지 마세요. 데이터가 없는 부분은 반드시 "자료 없음", "아직 이수 전" 등으로 명확히 표기할 것.
      3. 보완 제안 시, "독서를 해라", "성적을 올려라"와 같은 뻔한 조언은 지양하고, 현재 있는 데이터(또는 없는 데이터의 한계)를 기반으로 다음 학기에 어떤 개념을 어떻게 채울지 타겟 과제를 지목할 것.
      4. 종합 분석 텍스트('analysis_text') 작성 시, 분석의 근거가 된 **'입학처 모집요강의 출처와 연도'**를 반드시 명시할 것.
      5. 종합 분석 텍스트('analysis_text') 맨 끝에 반드시 다음 문구를 한 문단 띄운 후 개행하여 그대로 덧붙여 포함시킬 것:
         "이 제안은 참고용이며 최종 판단은 학교 선생님 및 입학처 확인 필요"

      반드시 아래 JSON 스키마 구조로만 응답해줘 (마크다운 백틱 제외, 순수 JSON 텍스트):
      {
        "match_score": 0~100 사이의 정수,
        "strengths": ["실제 데이터를 근거로 구체적 사실이 인용된 강점 1", "강점 2"],
        "weaknesses": ["실제 성적/기록의 약점과 대학 인재상을 엮은 약점 1", "약점 2"],
        "recommendations": ["학생의 학년에 맞춘 아주 상세하고 실행 가능한 보완 제안 1", "보완 제안 2", "보완 제안 3"],
        "analysis_text": "종합 리포트 텍스트... (마지막 단락에 '이 제안은 참고용이며 최종 판단은 학교 선생님 및 입학처 확인 필요'가 필수 명시되어야 함)"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API Error (University Match):', error);
    return {
      ...mockResult,
      analysis_text: `AI 분석 호출에 실패하여 데모 데이터로 대체되었습니다. (오류: ${error instanceof Error ? error.message : '알 수 없음'})\n\n이 제안은 참고용이며 최종 판단은 학교 선생님 및 입학처 확인 필요`
    };
  }
}

export interface FinalReportInput {
  profile: {
    name: string;
    career_wish: string;
  };
  academic: Array<{
    grade: number;
    semester: number;
    subject_name: string;
    rank_rating: number | null;
    credit_units: number;
  }>;
  activities: Array<{
    id: string;
    grade: number;
    semester: number;
    activity_type: string;
    title: string;
    content: string;
    reflection?: string;
  }>;
}

export async function generateFinalAdmissionReport(
  studentData: FinalReportInput,
  univName: string,
  deptName: string
): Promise<{
  recommended_activity_ids: string[]; // AI가 추천하는 하이라이트 활동 ID 목록
  essay_materials: Array<{
    question_type: string; // "학업 역량", "공동체 역량", "진로/전공 적합성" 등
    recommended_title: string;
    writing_guide: string;
  }>;
  interview_preps: Array<{
    question: string;
    related_activity_title: string;
    answer_structure_tip: string;
  }>;
}> {
  const mockReport = {
    recommended_activity_ids: ['act-2', 'act-4', 'act-1'], // 이진탐색, 수열 합 계산, 환경 캠페인 추천
    essay_materials: [
      {
        question_type: "교과 학업 역량 및 탐구 경험 (자소서 1번 문항 대응)",
        recommended_title: "[수학Ⅰ] 수열의 합 공식을 대입한 프로그램 시간 복잡도 계산 증명",
        writing_guide: "수학Ⅰ 단원에서 이수한 등차/등비수열 개념이 단순 프로그래밍 반복 연산을 효율화하는 데 어떻게 기여하는지 본인이 '스스로 증명한 과정'을 상세히 서술하십시오. 코딩 활용 능력뿐만 아니라 수학적 정당성을 짚고 넘어간 자기주도적 학업 태도를 강조해야 합니다."
      },
      {
        question_type: "진로 및 전공 적합성 탐구 (자소서 2번 문항 대응)",
        recommended_title: "[동아리활동] 이진 탐색 알고리즘 시각화 시뮬레이터 개발",
        writing_guide: "Pygame 라이브러리를 활용해 배열 탐색 효율을 O(log N)으로 줄이는 과정을 도식화할 때 마주한 코딩적 난관(예: 렌더링 프레임 동기화 또는 데이터 정렬 유효성 확보)을 기재하고, 이를 극복하기 위해 탐구한 자료구조 서적과 연계하여 해결 실마리를 찾은 지적 극복 과정을 묘사하십시오."
      },
      {
        question_type: "공동체 및 협업 실천 (자소서 3번 문항 대응)",
        recommended_title: "[자율활동] 학급 자치회 환경 보호 텀블러 캠페인 기획",
        writing_guide: "학급 내에서 1회용 컵 제한에 반대하거나 참여가 저조했던 급우들의 불만을 해결하기 위해 쿠폰 제도를 기획하고, 이견 조율 과정에서 발휘한 리더십과 데이터 수집 기반 설득 과정을 객관적으로 서술하여 공동체 문제 해결 능력을 부각하십시오."
      }
    ],
    interview_preps: [
      {
        question: "이진 탐색 알고리즘 시뮬레이터를 개발했다고 했는데, 이진 탐색을 사용하기 위해 배열이 갖추어야 할 전제 조건은 무엇이며 그 이유는 무엇인가요?",
        related_activity_title: "알고리즘 탐구반 - 이진 탐색 알고리즘 시각화 프로젝트",
        answer_structure_tip: "전제 조건인 '데이터의 정렬(Sorted)'을 반드시 언급하고, 정렬되지 않은 배열에서는 중앙값 기준 대소비교를 통한 탐색 범위 절반 축소가 불가능함을 논리적으로 대답하십시오."
      },
      {
        question: "수열의 합과 루프문 연산 횟수의 연계성을 증명했는데, 다중 루프문(Nested Loop)의 시간 복잡도를 수열로 표현하면 어떻게 되나요?",
        related_activity_title: "수학Ⅰ - 수열의 합을 이용한 프로그램 실행시간 계산",
        answer_structure_tip: "이중 루프의 경우 인덱스 변수의 성장에 따라 연산 횟수가 등차수열의 합과 유사한 O(N^2) 구조를 가짐을 수학적으로 정의하여 답변하십시오."
      }
    ]
  };

  if (!genAI) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return mockReport;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      학생의 3개년 누적 학생부 데이터(성적, 활동 기록)와 지원할 최종 목표 대학/학과를 분석하여, 
      학생 스스로 자기소개서를 작성하거나 면접을 대비할 때 참조할 "소재 정리표 및 면접 대비 질문집"을 생성해줘.
      대필 자소서 본문 작성이 아니라, 자소서 문항별로 활용하기 가장 좋은 '추천 활동 명칭'과 '작성 시 스토리라인 방향 가이드'를 제시해야 해.

      [학생 누적 성적 요약]
      ${JSON.stringify(studentData.academic, null, 2)}

      [학생 누적 활동 데이터]
      ${JSON.stringify(studentData.activities, null, 2)}

      [최종 목표 대학 / 학과]
      - 대학: ${univName}
      - 학과: ${deptName}

      [결과 요구 사항 및 할루시네이션(거짓 정보 생성) 방지 가이드]
      1. recommended_activity_ids: 학생의 누적 활동들 중 전공 적합성이 가장 강력한 3가지 활동의 실제 ID 목록을 추천. (만약 제공된 활동 데이터가 3개 미만이거나 아예 없다면 있는 것만 포함하고, 빈칸 지어내기 절대 금지)
      2. essay_materials: 자소서 문항별(학업, 진로, 공동체)로 가장 부합하는 학생의 실제 활동을 지칭. 데이터에 없는 내용(예: 듣지도 않은 과목, 하지 않은 임원 활동 등)을 지어내면 절대 안 됨. 해당 유형에 맞는 데이터가 전혀 없다면 "관련 자료 없음"으로 명시.
      3. interview_preps: 실제 학생의 생기부 기재 내용에 근거한 모의 면접 예상 질문 2가지를 뽑고 팁을 작성. 데이터가 부족하여 2가지를 뽑을 수 없다면 가능한 개수만 출력하고 빈칸은 "기록 없음" 처리.

      반드시 아래 JSON 스키마 구조로만 응답해줘 (마크다운 백틱 제외, 순수 JSON 텍스트):
      {
        "recommended_activity_ids": ["활동ID1", "활동ID2", "활동ID3"],
        "essay_materials": [
          {
            "question_type": "문항 유형 분류",
            "recommended_title": "학생부 기록에 있는 실제 활동 제목",
            "writing_guide": "스토리라인 서술 팁 및 전공 강조 전략 (구체적 근거 제시)"
          }
        ],
        "interview_preps": [
          {
            "question": "생기부 기재 사실 기반 예상 꼬리 질문",
            "related_activity_title": "연계 활동명",
            "answer_structure_tip": "합격 확률을 높이는 답변 논리 구조 가이드"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API Error (Final Report):', error);
    return mockReport;
  }
}

export async function analyzeDocumentOcr(
  fileBase64: string,
  mimeType: string
): Promise<{
  academic_records: any[];
  mock_exam_records: any[];
  activities: any[];
}> {
  const mockOcrResult = {
    academic_records: [
      {
        grade: 2,
        semester: 1,
        exam_type: "학기말고사",
        subject_name: "수학Ⅱ",
        rank_rating: 1,
        original_score: 95,
        standard_deviation: 12,
        credit_units: 4
      },
      {
        grade: 2,
        semester: 1,
        exam_type: "학기말고사",
        subject_name: "물리학Ⅰ",
        rank_rating: 2,
        original_score: 88,
        standard_deviation: 15,
        credit_units: 3
      }
    ],
    mock_exam_records: [
      {
        grade: 2,
        exam_date: "2025-06-04",
        exam_name: "6월 수능모의평가",
        results: {
          "국어": { "grade": 2, "standard_score": 125, "percentile": 92 },
          "수학": { "grade": 1, "standard_score": 138, "percentile": 97 },
          "영어": { "grade": 1, "standard_score": null, "percentile": null }
        }
      }
    ],
    activities: [
      {
        grade: 2,
        semester: 1,
        activity_type: "세부능력 및 특기사항",
        title: "수학Ⅱ 세특 - 함수의 극한 실생활 모델링",
        content: "수학Ⅱ 세특 탐구 보고서에서 극한 개념을 활용한 바이러스 확산 예측 모델(SIR 모델)의 한계치를 수학적으로 유도함. 2024 대입 트렌드에 부합하는 탐구력이 돋보임.",
        subject_name: "수학Ⅱ",
        related_book: "수학으로 배우는 파이썬"
      }
    ]
  };

  if (!genAI) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return mockOcrResult;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: { responseMimeType: "application/json" }
    });

    const filePart = {
      inlineData: {
        data: fileBase64,
        mimeType: mimeType
      }
    };

    const prompt = `
      첨부된 성적표 이미지 또는 생기부 PDF 문서 파일 데이터를 판독하여, 
      학생의 내신 성적 기록(academic_records), 모의고사 기록(mock_exam_records), 생기부 창체/세특 활동 기록(activities)을 구조화된 JSON 데이터로 추출해줘.
      
      [판독 지침]
      1. 문서에 기재된 학년(grade) 및 학기(semester) 정보를 판단하여 1~3학년, 1~2학기 숫자로 채워넣어줘.
      2. 내신 성적(중간/기말/학기말) 정보가 판독되면 'academic_records' 배열을 채워줘. 'exam_type'은 반드시 '중간고사' | '기말고사' | '학기말고사' 중 하나여야 해.
      3. 모의고사 성적표인 경우 'mock_exam_records' 배열을 채우고, 국어/수학/영어/탐구 등의 등급(1~9), 표준점수, 백분위 값을 채워줘.
      4. 생활기록부 활동 내역이 발견되면 'activities' 배열을 채워줘. 'activity_type'은 반드시 '자율활동' | '동아리활동' | '진로활동' | '세부능력 및 특기사항' | '행동특성 및 종합의견' 중 하나여야 해.
      5. 문서에 없는 성적이나 카테고리는 빈 배열[]로 비워두어야 해.

      반드시 아래 JSON 스키마 구조로만 응답해줘 (마크다운 백틱 제외, 순수 JSON 텍스트):
      {
        "academic_records": [
          {
            "grade": 1~3,
            "semester": 1~2,
            "exam_type": "중간고사" | "기말고사" | "학기말고사",
            "subject_name": "과목명",
            "rank_rating": 등급(숫자 또는 null),
            "original_score": 원점수(숫자 또는 null),
            "standard_deviation": 표준편차(숫자 또는 null),
            "credit_units": 이수단위(숫자)
          }
        ],
        "mock_exam_records": [
          {
            "grade": 1~3,
            "exam_date": "YYYY-MM-DD",
            "exam_name": "시험명칭",
            "results": {
              "국어": { "grade": 1~9, "standard_score": 숫자 | null, "percentile": 숫자 | null },
              "수학": { "grade": 1~9, "standard_score": 숫자 | null, "percentile": 숫자 | null }
              // 타 영역들...
            }
          }
        ],
        "activities": [
          {
            "grade": 1~3,
            "semester": 1~2,
            "activity_type": "자율활동" | "동아리활동" | "진로활동" | "세부능력 및 특기사항" | "행동특성 및 종합의견",
            "title": "활동 요약 타이틀",
            "content": "상세 활동 내용 및 기록",
            "subject_name": "과목명(세특인 경우만 기재, 아닐 경우 null)",
            "related_book": "연계 독서 도서명(아닐 경우 null)"
          }
        ]
      }
    `;

    const result = await model.generateContent([filePart, prompt]);
    const response = result.response;
    const jsonText = response.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API Error (OCR Scanning):', error);
    return mockOcrResult;
  }
}

export async function generatePersonalBranding(
  activities: any[],
  careerHistory: any[]
): Promise<{
  branding_keywords: Array<{
    keyword: string;
    reason: string;
    storyline: string;
  }>;
  synthesis_storyline_guide: string;
}> {
  const mockBranding = {
    branding_keywords: [
      {
        keyword: "환경 생태계 문제에 AI 컴퓨팅 솔루션을 결합하는 융합적 탐구자",
        reason: "1학년 진로활동의 생태 환경 캠페인 기록과 2학년 수학Ⅱ 탐구 보고서에서 극한 모델링(SIR 바이러스 확산 예측)을 작성한 텍스트 기반 융합력이 도출됨. 특히 컴퓨터 코딩을 생태 관찰 데이터 정량화에 활용한 부분이 매력적임.",
        storyline: "자기소개서 작성 시 1단락에서는 환경 동아리에서 플라스틱 생분해 데이터를 엑셀로 통계 내던 한계를 고백하고, 2단락에서 수학Ⅱ 세특의 감염병 수리 모델링 개념을 컴퓨터 사이언스와 연결해 한계를 극복하려 한 학업적 노력을 극적으로 서술하는 면접 스토리라인 구축 권장."
      },
      {
        keyword: "이론에 갇히지 않고 알고리즘의 사회적 한계를 성찰하는 인문학적 공학도",
        reason: "생기부 기록 중 물리Ⅰ 탐구와 과학 독서 연계 활동(수학으로 배우는 파이썬)에서 기술의 오남용 및 AI 윤리에 대해 토론하고 비판적 시각을 드러낸 독서 내용들이 여러 차례 강조됨.",
        storyline: "면접 대비 질문으로 '알고리즘의 편향성이 사회적 약자에게 미치는 영향과 공학도로서의 해결방안'에 대해 생기부 속 AI 윤리 탐구 보고서의 내용을 토대로 답변 논리 구조를 준비하십시오."
      },
      {
        keyword: "자기주도적으로 가설을 수립하고 코드로 증명해내는 실천적 문제해결사",
        reason: "3개년 동아리활동에서 단순 참여에 그치지 않고, 매 학기마다 직접 조장을 맡아 탐구 가설을 세운 뒤 실제 동작하는 파이썬 스크립트 코드를 구축하여 부원들에게 시연한 주도적인 활동 실적들이 높게 평가됨.",
        storyline: "면접관이 프로젝트 수행 시 부원들과의 협협 과정에서 발생한 코딩 디버깅 문제를 물을 때, 조장으로서 논리적 분석을 통해 알고리즘 병목을 파악하고 소통으로 갈등을 해결했던 실사례(동아리 활동지 기록 활용)를 스토리로 녹여내십시오."
      }
    ],
    synthesis_storyline_guide: "이 학생은 환경과 IT 기술의 융합이라는 뚜렷한 진로 정체성(Career Goal History)을 가지고 있습니다. 컴퓨터공학과, 소프트웨어학과 혹은 스마트도시/환경공학과 지원 시 강력한 퍼스널 브랜딩을 구축할 수 있습니다. 3학년 자기소개서 혹은 면접 대비 시, 본인의 코딩 기술적 성과에만 매몰되지 말고 '왜 컴퓨터 전공자가 환경 문제에 이토록 비판적 성찰을 쏟아붓게 되었는지' 인문학적·사회적 동기(1학년 자율/진로 기록 연계)를 전단에 배치하여 면접관의 호기심을 유도하십시오."
  };

  if (!genAI) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return mockBranding;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: { responseMimeType: "application/json" }
    });

    const activitiesText = activities.map(a => 
      `[${a.grade}학년] (${a.activity_type}) 제목: ${a.title} / 내용: ${a.content} ${a.subject_name ? `/ 과목: ${a.subject_name}` : ''} ${a.related_book ? `/ 독서: ${a.related_book}` : ''}`
    ).join('\n');

    const careerText = careerHistory.map(c => 
      `[${c.grade}학년 ${c.semester || 1}학기] 희망학과: ${c.department_name} / 희망대학: ${c.university_name || '미정'} / 순위: ${c.priority || 1}`
    ).join('\n');

    const prompt = `
      학생의 3개년 학생부 활동 기록(activities)과 진로/목표 대학 변경 이력(careerHistory) 전체를 종합 분석하여,
      이 학생의 고유한 학문적 캐릭터와 학종 컨셉을 잡아주는 "핵심 브랜딩 키워드" 3가지와 이에 관한 자소서/면접용 스토리라인 전개 가이드를 제시해줘.

      [분석 가이드]
      1. 학생의 개별 활동들 간의 유기적 상관관계(예: 물리 탐구와 컴퓨터 코딩, 생태 환경과 AI 모델링 등)를 찾아서 캐릭터 키워드를 명확하게 정리해줘.
      2. '핵심 브랜딩 키워드(keyword)'는 매력적인 수식어가 붙은 구체적인 인물상(예: '환경 문제에 컴퓨팅 사고력을 적용하는 실천적 연구자')으로 제안해줘.
      3. '이유(reason)'에는 생기부 텍스트 속에서 어떤 활동 기록이나 진로 희망을 근거로 삼았는지 인용하여 설득력을 높여줘.
      4. '스토리라인(storyline)'에는 3학년 대입 자기소개서 소재 배치 팁이나 면접 예상 꼬리질문 대응 등 실전 활용 가이드를 구체적으로 제안해줘.

      [학생의 누적 생기부 활동 기록]
      ${activitiesText || '기록된 활동 없음'}

      [학생의 누적 진로 희망 및 목표대학 이력]
      ${careerText || '기록된 진로 이력 없음'}

      반드시 아래 JSON 스키마 구조로만 응답해줘 (마크다운 백틱 제외, 순수 JSON 텍스트):
      {
        "branding_keywords": [
          {
            "keyword": "핵심 브랜딩 키워드 1",
            "reason": "생기부 기반 도출 사유 및 근거 활동 서술",
            "storyline": "자소서/면접 시 활용할 스토리 전개 가이드 및 연계 강조 전략"
          },
          {
            "keyword": "핵심 브랜딩 키워드 2",
            "reason": "생기부 기반 도출 사유 및 근거 활동 서술",
            "storyline": "자소서/면접 시 활용할 스토리 전개 가이드 및 연계 강조 전략"
          },
          {
            "keyword": "핵심 브랜딩 키워드 3",
            "reason": "생기부 기반 도출 사유 및 근거 활동 서술",
            "storyline": "자소서/면접 시 활용할 스토리 전개 가이드 및 연계 강조 전략"
          }
        ],
        "synthesis_storyline_guide": "전체 생기부를 융합한 최종 퍼스널 브랜딩 요약 및 지원 전공 적합성 강조 팁"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API Error (Personal Branding):', error);
    return mockBranding;
  }
}


export interface RecommendationResult {
  university: string;
  department: string;
  type: '상향' | '적정' | '하향';
  reason: string;
}

export async function recommendUniversities(
  studentData: any
): Promise<RecommendationResult[]> {
  const mockRecommendations: RecommendationResult[] = [
    { university: '서울대학교', department: '컴퓨터공학부', type: '상향', reason: '알고리즘 및 수학적 역량이 뛰어나며 융합적 사고력이 돋보이나 최상위권 내신 경쟁이 치열함.' },
    { university: '고려대학교', department: '스마트보안학부', type: '상향', reason: '사이버 보안 및 이진 탐색 로직 등 코딩 기초 체력이 훌륭하여 학업우수형 전형에 유리함.' },
    { university: '성균관대학교', department: '소프트웨어학과', type: '상향', reason: '자기주도적인 파이썬 프로젝트 경험이 성균인재 전형의 탐구 역량 평가와 일치함.' },
    { university: '한양대학교', department: '컴퓨터소프트웨어학부', type: '적정', reason: '실무 코딩 역량과 수리적 증명 능력을 바탕으로 학생부종합 일반전형 합격 가능성이 높음.' },
    { university: '중앙대학교', department: '소프트웨어학부', type: '적정', reason: '탐구형 인재 전형에서 요구하는 심화 탐구 능력을 알고리즘 시각화 프로젝트로 충분히 증명함.' },
    { university: '경희대학교', department: '컴퓨터공학과', type: '적정', reason: '네오르네상스 전형에서 중시하는 전공 기초 소양과 동아리 리더십 경험이 매우 우수함.' },
    { university: '건국대학교', department: '컴퓨터공학부', type: '적정', reason: 'KU자기추천 전형의 핵심인 전공에 대한 관심과 자기주도적 학습 태도가 뚜렷하게 나타남.' },
    { university: '동국대학교', department: 'AI소프트웨어융합학부', type: '적정', reason: 'Do Dream 전형에서 인문/공학 융합적 사고를 가진 학생을 선호하므로 높은 적합성을 보임.' },
    { university: '국민대학교', department: '소프트웨어학부', type: '하향', reason: '알고리즘 기초 및 구현 역량이 이미 국민대 합격선 평균을 상회하여 안정적인 합격이 예상됨.' },
    { university: '숭실대학교', department: '컴퓨터학부', type: '하향', reason: 'SSU미래인재 전형에서 선호하는 코딩 프로젝트 실적을 다수 보유하여 합격 확률이 매우 높음.' }
  ];

  if (!genAI) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return mockRecommendations;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: { responseMimeType: "application/json" }
    });

    const activitiesText = studentData.activities.map((a: any) => 
      `[${a.grade}학년] (${a.activity_type}) 제목: ${a.title} / 내용: ${a.content}`
    ).join('\n');

    const prompt = `
      당신은 대한민국 최고의 대입 입시 컨설턴트입니다.
      학생의 전체 생기부 데이터(내신 성적 및 비교과 활동)를 종합적으로 분석하여,
      현재 학생의 역량과 가장 잘 맞는 대학교 및 학과 10곳을 추천해 주세요.
      추천 조합은 반드시 [상향 지원 3개], [적정 지원 5개], [하향 안정 지원 2개]로 구성해야 합니다.

      [학생 데이터]
      - 내신 및 학업 성취도 요약:
      ${JSON.stringify(studentData.academic, null, 2)}
      - 주요 활동 및 세특 기록:
      ${activitiesText}
      - 기존 희망 진로: ${studentData.profile?.career_wish || '없음'}

      [분석 가이드]
      1. 학생의 뚜렷한 강점(예: 알고리즘 설계, 생태 환경 분석, 어학 능력 등)을 도출하여 그에 맞는 전공을 매칭하세요.
      2. 대학교 이름은 한국의 실제 존재하는 4년제 대학교명(예: 서울대학교, 연세대학교, 한양대학교, 국민대학교 등)을 정확히 사용하세요.
      3. '상향', '적정', '하향'의 구분을 학생의 잠재력을 고려하여 현실감 있게 배치하세요.
      4. 추천 사유(reason)에는 학생의 생기부에 있는 '특정 활동 내용'을 직접 언급하며 왜 이 전형/학과에 유리한지 논리적으로 설명하세요.

      반드시 아래 JSON 배열 형식으로만 응답해 주세요 (마크다운 백틱 제외, 순수 JSON 텍스트):
      [
        {
          "university": "대학교명",
          "department": "학과명",
          "type": "상향" | "적정" | "하향",
          "reason": "생기부 기록과 연계된 구체적인 추천 사유 (2~3문장)"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text().trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API Error (University Recommendation):', error);
    return mockRecommendations;
  }
}
