export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

// Mock 입시 정보 데이터베이스 (API 키가 없거나 검색 오류 시 활용하여 실감나는 사용자 경험 제공)
const MOCK_ADMISSION_DATABASE: Record<string, Record<string, { guide: string; urls: string[] }>> = {
  "서울대학교": {
    "컴퓨터공학부": {
      guide: "서울대학교 컴퓨터공학부는 학생부종합전형(지역균형선발전형 및 일반전형)을 통해 인재를 모집합니다. 핵심 평가 요소는 수학 및 과학(물리, 화학 등) 교과의 이수 현황과 학업 성취도입니다. 학교 생활을 통한 주도적인 탐구 능력, 동아리 활동 내 하드웨어/소프트웨어 프로젝트 수행 경험을 높이 평가합니다. 1단계 서류평가 100% 후 2단계에서 면접(공학적 소양 및 수학적 사고력 측정) 30%를 합산하여 최종 선발합니다.",
      urls: ["https://admission.snu.ac.kr/undergraduate/guide", "https://cse.snu.ac.kr/academic/undergraduate/admission"]
    },
    "의예과": {
      guide: "서울대학교 의예과는 지역균형 및 일반전형으로 모집하며, 다중미니면접(MMI)을 실시하여 의사로서의 자질과 인성, 협동심을 평가합니다. 수학, 생명과학, 화학 교과의 이수 과목과 심화 탐구 능력이 필수적이며, 생기부 세특을 통해 관찰력, 생명윤리 의식, 끈기 있는 탐구 자세가 상세히 기술되어 있어야 합니다.",
      urls: ["https://admission.snu.ac.kr/undergraduate/guide", "https://medicine.snu.ac.kr/admissions"]
    },
    "경영학과": {
      guide: "서울대학교 경영대학은 인문학적 소양과 수학적 분석 능력을 겸비한 글로벌 인재를 선호합니다. 수학, 사회 탐구(경제, 사회문화 등) 과목의 이수와 높은 성취가 요구되며, 자율 활동 및 진로 활동에서 협업 능력과 리더십을 증명하는 리포트나 프로젝트 탐구 내역이 중요합니다.",
      urls: ["https://admission.snu.ac.kr/undergraduate/guide", "https://cba.snu.ac.kr/academic/undergraduate/admission"]
    }
  },
  "연세대학교": {
    "컴퓨터과학과": {
      guide: "연세대학교 컴퓨터과학과는 학생부종합(활동우수형)과 학생부교과(추천형)로 선발합니다. 활동우수형의 경우, 수학/과학 교과 역량과 함께 IT 관련 동아리에서의 설계/코딩 실습 실적을 유심히 봅니다. 제시문 기반 면접이 포함되어 논리적이고 체계적인 사고 능력이 당락을 결정합니다. 수능 최저학력기준이 적용되므로 모의고사 성적 관리도 병행해야 합니다.",
      urls: ["https://admission.yonsei.ac.kr/seoul", "https://cs.yonsei.ac.kr/admission"]
    },
    "신소재공학과": {
      guide: "연세대학교 신소재공학과는 화학과 물리학의 융합적 이해를 중요하게 봅니다. 실험 과목의 이수 여부와 과학 과목에서의 창의적 가설 설정 및 실험 설계 능력을 종합 평가합니다. 전공 분야 독서(나노 기술, 재료 과학 등) 활동과 세특 연계가 주요 강점으로 작동합니다.",
      urls: ["https://admission.yonsei.ac.kr/seoul", "https://mse.yonsei.ac.kr"]
    }
  },
  "고려대학교": {
    "컴퓨터학과": {
      guide: "고려대학교 컴퓨터학과는 학업우수형과 계열적합형 전형으로 선발합니다. 계열적합형은 수능 최저가 없는 대신 2단계 면접 비율이 높고 전공 적합성을 강하게 봅니다. 알고리즘 설계 능력, 문제 정의 및 코딩 해결력, 수학적 모델링 능력이 생활기록부 세특 및 창체 활동 전반에 깊이 드러나야 합니다.",
      urls: ["https://oku.korea.ac.kr/oku/specialty/dept.shtml", "https://computer.korea.ac.kr"]
    },
    "경영학과": {
      guide: "고려대학교 경영대학은 사회과학 및 경제 이슈에 대한 탐구와 글로벌 소통 능력을 갖춘 인재를 선호합니다. 비즈니스 리더십, 통계 분석력, 인문학적 독서 역량이 종합 평가되며, 적극적인 토론 활동과 모의 경영대회 등 경영 동아리 내에서의 자기주도성이 핵심 평가 요소입니다.",
      urls: ["https://oku.korea.ac.kr/oku", "https://biz.korea.ac.kr"]
    }
  }
};

const DEFAULT_GUIDE = "해당 대학 및 학과의 공식 입학 홈페이지 및 학과 소개 페이지 정보입니다. 전공 적합성 중심의 학생부 종합전형 평가에 따르면, 관련 기초 과목(수학, 과학, 사회 등 전공 밀접 과목)의 높은 학업 성취도와 세부능력 및 특기사항에 나타난 주도적인 주제 탐구 프로젝트, 전공에 대한 깊은 관심을 드러내는 독서 활동을 종합적으로 정성 평가합니다.";
const DEFAULT_URLS = ["https://www.uwayapply.com", "https://www.jinhakapply.com"];

export async function searchUniversityAdmission(
  universityName: string,
  departmentName: string
): Promise<{
  guide_summary: string;
  source_urls: string[];
  search_results: SearchResult[];
}> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const cleanUniv = universityName.trim();
  const cleanDept = departmentName.trim();

  // 1. Check if we have mock database matching
  let matchedGuide = DEFAULT_GUIDE;
  let matchedUrls = DEFAULT_URLS;

  const univKey = Object.keys(MOCK_ADMISSION_DATABASE).find(k => cleanUniv.includes(k) || k.includes(cleanUniv));
  if (univKey) {
    const deptKey = Object.keys(MOCK_ADMISSION_DATABASE[univKey]).find(k => cleanDept.includes(k) || k.includes(cleanDept));
    if (deptKey) {
      const data = MOCK_ADMISSION_DATABASE[univKey][deptKey];
      matchedGuide = data.guide;
      matchedUrls = data.urls;
    }
  }

  // 2. Generate simulated search results to show to user
  const search_results: SearchResult[] = [
    {
      title: `${universityName} 입학처 - 수시모집 요강`,
      link: matchedUrls[0],
      snippet: `2027학년도 ${universityName} 수시 모집 요강 안내. 학생부종합전형 지원 자격, 전형 요소별 반영 비율(서류 100%, 면접 30% 등) 및 수능 최저학력기준 세부 내용 수록.`,
      source: `${universityName} 공식 입학처`
    },
    {
      title: `${universityName} ${departmentName} 교육과정 및 인재상`,
      link: matchedUrls[1] || matchedUrls[0],
      snippet: `${departmentName} 학부 소개, 이수 체계도 및 전공 선택 과목 가이드라인. 전공 적합성 평가를 위한 고등학교 권장 이수 과목 정보 제공.`,
      source: `${universityName} ${departmentName} 학과 홈페이지`
    },
    {
      title: `대학어디가(adiga) ${universityName} ${departmentName} 입시 결과`,
      link: "https://www.adiga.kr",
      snippet: `대입정보포털 어디가 제공 ${universityName} ${departmentName} 수시 학생부 종합/교과 전형 최종등록자 50% 컷, 70% 컷 내신 등급 및 추합 인원 통계.`,
      source: "대입정보포털 어디가"
    }
  ];

  return {
    guide_summary: matchedGuide,
    source_urls: matchedUrls,
    search_results
  };
}
