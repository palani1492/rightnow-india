import type { AgentResponse, Language, MissionId } from "./schemas";

type MissionPattern = Readonly<{
  missionId: MissionId;
  patterns: readonly RegExp[];
}>;

const missionPatterns: readonly MissionPattern[] = [
  {
    missionId: "job-loss",
    patterns: [
      /lost (my )?job|laid off|unemploy/i,
      /नौकरी (चली|गई)|बेरोजगार/u,
      /வேலை (இழந்த|போய)|வேலையின்மை/u,
    ],
  },
  {
    missionId: "pregnancy",
    patterns: [
      /pregnan|expecting|new baby|maternity/i,
      /गर्भवती|गर्भावस्था|बच्चा होने/u,
      /கர்ப்பம்|கர்ப்பிணி|குழந்தை பிறக்க/u,
    ],
  },
  {
    missionId: "college",
    patterns: [
      /college|scholarship|university|student|study/i,
      /कॉलेज|छात्रवृत्ति|पढ़ाई|विद्यार्थी/u,
      /கல்லூரி|உதவித்தொகை|படிப்பு|மாணவர்/u,
    ],
  },
  {
    missionId: "business",
    patterns: [
      /business|small shop|start a shop|udyam|mudra|pmegp|gst/i,
      /व्यवसाय|दुकान|उद्यम|मुद्रा/u,
      /வணிகம்|தொழில்|கடை|உதயம்/u,
    ],
  },
  {
    missionId: "grievance",
    patterns: [
      /complaint|grievance|consumer problem|public service problem/i,
      /शिकायत|उपभोक्ता|सरकारी सेवा की समस्या/u,
      /புகார்|நுகர்வோர்|அரசு சேவை பிரச்சனை/u,
    ],
  },
  {
    missionId: "work",
    patterns: [
      /first job|started (a new )?job|started earning|freelanc|remote work|started work|work from home/i,
      /पहली नौकरी|फ्रीलांस|घर से काम|काम शुरू/u,
      /முதல் வேலை|ப்ரீலான்ஸ்|வீட்டிலிருந்து வேலை|வேலை தொடங்க/u,
    ],
  },
] as const;

const replies: Readonly<Record<Language, Readonly<Record<MissionId, string>>>> = {
  en: {
    pregnancy: "I found the pregnancy mission. I can prepare maternity and birth-readiness services with a few non-sensitive details.",
    college: "I found the college mission. I can check scholarship and academic-document readiness.",
    work: "I found the first-work mission. I can prepare tax and social-security readiness without asking for identifiers.",
    "job-loss": "I found the job-loss mission. I can check benefit, claim, and career-service readiness.",
    business: "I found the small-business mission. I can prepare registration, tax, and funding-readiness actions.",
    grievance: "I found the public-service problem mission. I can prepare the right mock grievance path.",
  },
  hi: {
    pregnancy: "मैंने गर्भावस्था मिशन पहचाना है। कुछ गैर-संवेदनशील जानकारी से सेवाएं तैयार की जा सकती हैं।",
    college: "मैंने कॉलेज मिशन पहचाना है। छात्रवृत्ति और शैक्षणिक दस्तावेज़ तैयारी जाँची जा सकती है।",
    work: "मैंने पहला काम मिशन पहचाना है। पहचान संख्या के बिना कर और सामाजिक सुरक्षा तैयारी की जा सकती है।",
    "job-loss": "मैंने नौकरी छूटने का मिशन पहचाना है। लाभ, दावा और करियर सेवाओं की तैयारी जाँची जा सकती है।",
    business: "मैंने छोटा व्यवसाय मिशन पहचाना है। पंजीकरण, कर और वित्त तैयारी की जा सकती है।",
    grievance: "मैंने सार्वजनिक सेवा समस्या मिशन पहचाना है। सही नकली शिकायत मार्ग तैयार किया जा सकता है।",
  },
  ta: {
    pregnancy: "கர்ப்பகால தேவையை கண்டறிந்தேன். முக்கிய சேவைகளை தனிப்பட்ட அடையாளங்கள் இல்லாமல் தயார் செய்யலாம்.",
    college: "கல்லூரி தேவையை கண்டறிந்தேன். உதவித்தொகை மற்றும் கல்வி ஆவணத் தயார்நிலையை பார்க்கலாம்.",
    work: "முதல் வேலை தேவையை கண்டறிந்தேன். அடையாள எண்கள் இல்லாமல் வரி மற்றும் சமூக பாதுகாப்பை தயார் செய்யலாம்.",
    "job-loss": "வேலை இழப்பு தேவையை கண்டறிந்தேன். பயன், கோரிக்கை மற்றும் வேலைவாய்ப்பு சேவைகளை பார்க்கலாம்.",
    business: "சிறு வணிக தேவையை கண்டறிந்தேன். பதிவு, வரி மற்றும் நிதி தயார்நிலையை பார்க்கலாம்.",
    grievance: "பொது சேவை புகாரை கண்டறிந்தேன். சரியான மாதிரி புகார் வழியை தயார் செய்யலாம்.",
  },
};

export function safeMissionReply(
  missionId: MissionId | null,
  language: Language,
): string {
  if (missionId) return replies[language][missionId];
  if (language === "hi") {
    return "यह जरूरत अभी इस डेमो में नहीं है। कृपया आधिकारिक UMANG या myScheme से शुरुआत करें।";
  }
  if (language === "ta") {
    return "இந்த தேவை இந்த டெமோவில் இன்னும் இல்லை. அதிகாரப்பூர்வ UMANG அல்லது myScheme தளத்தில் தொடங்குங்கள்.";
  }
  return "That need is not in this demo yet. Please start with the official UMANG or myScheme entry point.";
}

export function detectLanguage(message: string, locale?: Language): Language {
  if (/[\u0B80-\u0BFF]/u.test(message)) return "ta";
  if (/[\u0900-\u097F]/u.test(message)) return "hi";
  return locale ?? "en";
}

export function deterministicInterpretation(
  message: string,
  locale?: Language,
  fallbackReason?: AgentResponse["fallbackReason"],
): AgentResponse {
  const language = detectLanguage(message, locale);
  const match = missionPatterns.find(({ patterns }) =>
    patterns.some((pattern) => pattern.test(message)),
  );

  if (!match) {
    return {
      language,
      missionId: null,
      confidence: 0,
      facts: [],
      mode: "fallback",
      fallbackReason,
      reply: safeMissionReply(null, language),
    };
  }

  return {
    language,
    missionId: match.missionId,
    confidence: 0.72,
    facts: [{ key: "lifeEvent", value: match.missionId }],
    reply: safeMissionReply(match.missionId, language),
    mode: "fallback",
    fallbackReason,
  };
}
