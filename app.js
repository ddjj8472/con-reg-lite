const SOURCES = [
  {
    id: "building-act",
    title: "건축법",
    url: "https://www.law.go.kr/법령/건축법",
    keywords: ["건축", "건폐율", "용적률", "허가", "신고", "대지", "층", "높이"],
  },
  {
    id: "building-decree",
    title: "건축법 시행령",
    url: "https://www.law.go.kr/법령/건축법시행령",
    keywords: ["용도", "주택", "주차", "높이", "이격", "도로", "층"],
  },
  {
    id: "planning-act",
    title: "국토의 계획 및 이용에 관한 법률",
    url: "https://www.law.go.kr/법령/국토의계획및이용에관한법률",
    keywords: ["용도지역", "녹지", "상업", "주거", "지구", "토지", "개발"],
  },
  {
    id: "yongin-ordinance",
    title: "용인시 건축 조례",
    url: "https://www.law.go.kr/자치법규/용인시건축조례",
    keywords: ["용인", "처인구", "기흥구", "수지구", "조례", "용인시"],
  },
];

const elements = {
  location: document.querySelector("#location"),
  buildingType: document.querySelector("#building-type"),
  question: document.querySelector("#question"),
  apiKey: document.querySelector("#api-key"),
  sourceList: document.querySelector("#source-list"),
  answerSourceList: document.querySelector("#answer-source-list"),
  submit: document.querySelector("#submit-button"),
  answerCard: document.querySelector("#answer-card"),
  answer: document.querySelector("#answer"),
  status: document.querySelector("#status"),
  counter: document.querySelector("#counter"),
};

function renderSources() {
  elements.sourceList.innerHTML = SOURCES.map((source) => `
    <label class="source-option">
      <input type="checkbox" value="${source.id}" checked />
      <span>${source.title}</span>
      <a href="${source.url}" target="_blank" rel="noreferrer">원문 보기</a>
    </label>
  `).join("");
}

function selectedSources() {
  const checkedIds = new Set(
    [...elements.sourceList.querySelectorAll("input:checked")].map((input) => input.value),
  );
  const directSelections = SOURCES.filter((source) => checkedIds.has(source.id));
  if (directSelections.length) return directSelections;

  const text = [elements.location.value, elements.buildingType.value, elements.question.value].join(" ");
  const matches = SOURCES.filter((source) => source.keywords.some((word) => text.includes(word)));
  return matches.length ? matches : SOURCES.slice(0, 2);
}

function buildPrompt(sources) {
  const context = [
    `대상 지역: ${elements.location.value.trim() || "미입력"}`,
    `건축 조건: ${elements.buildingType.value.trim() || "미입력"}`,
    `질문: ${elements.question.value.trim()}`,
  ].join("\n");
  const sourceText = sources.map((source) => `- ${source.title}: ${source.url}`).join("\n");

  return `당신은 대한민국 건축 행정 검토를 돕는 AI입니다.
아래 질문에 한국어로 간결하게 답하세요.

[반드시 지킬 규칙]
1. 답변은 참고용 정보이며 법률 자문이나 행정기관의 최종 판단이 아님을 첫 문장에 분명히 밝힙니다.
2. 사실관계나 지역별 조례 조건이 부족하면 추측해 단정하지 말고, 필요한 확인사항을 제시합니다.
3. 제공되지 않은 조문 번호·수치·개정일을 지어내지 않습니다.
4. 아래 공식 원문은 확인 대상입니다. 답변 끝에 어떤 원문을 확인해야 하는지 제목만 적습니다.
5. 형식은 아래 네 제목만 사용합니다: [요약], [확인할 사항], [다음 단계], [공식 원문].

[확인할 공식 원문]
${sourceText}

[사용자 입력]
${context}`;
}

async function askGemini() {
  const apiKey = elements.apiKey.value.trim();
  const question = elements.question.value.trim();
  if (!apiKey) throw new Error("Gemini API 키를 입력해 주세요.");
  if (question.length < 10) throw new Error("질문을 10자 이상 입력해 주세요.");

  const sources = selectedSources();
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(sources) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || "Gemini API 요청에 실패했습니다.";
    throw new Error(detail);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!text) throw new Error("답변을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return { text, sources };
}

function renderAnswer(text, sources) {
  elements.answer.textContent = text;
  elements.answerSourceList.innerHTML = "";
  sources.forEach((source) => {
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${source.title} 원문 열기`;
    elements.answerSourceList.append(link);
  });
  elements.answerCard.classList.remove("hidden");
  elements.answerCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

elements.question.addEventListener("input", () => {
  elements.counter.textContent = `${elements.question.value.length.toLocaleString()} / 1,500`;
});

document.querySelector("#example-button").addEventListener("click", () => {
  elements.location.value = "용인시 처인구";
  elements.buildingType.value = "자연녹지지역, 단독주택 계획";
  elements.question.value = "자연녹지지역에 단독주택을 지으려 합니다. 건폐율과 용적률을 확인할 때 어떤 조건을 먼저 확인해야 하나요?";
  elements.question.dispatchEvent(new Event("input"));
});

document.querySelector("#toggle-key").addEventListener("click", (event) => {
  const isPassword = elements.apiKey.type === "password";
  elements.apiKey.type = isPassword ? "text" : "password";
  event.currentTarget.textContent = isPassword ? "숨김" : "표시";
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  await navigator.clipboard.writeText(elements.answer.textContent);
  elements.status.textContent = "답변을 복사했습니다.";
});

elements.submit.addEventListener("click", async () => {
  elements.submit.disabled = true;
  elements.submit.textContent = "검토 중…";
  elements.status.textContent = "질문을 정리하고 있습니다.";
  try {
    const { text, sources } = await askGemini();
    renderAnswer(text, sources);
    elements.status.textContent = "검토 결과를 만들었습니다.";
  } catch (error) {
    elements.status.textContent = error.message || "처리 중 오류가 발생했습니다.";
  } finally {
    elements.submit.disabled = false;
    elements.submit.textContent = "AI로 검토하기";
  }
});

renderSources();
