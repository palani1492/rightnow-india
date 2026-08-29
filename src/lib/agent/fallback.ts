import type { AgentResponse, Language, MissionId } from "./schemas";

type MissionPattern = Readonly<{
  missionId: MissionId;
  patterns: readonly RegExp[];
}>;

const missionPatterns: readonly MissionPattern[] = [
  {
    missionId: "moving",
    patterns: [
      /\b(?:mov(?:e|ing|ed)|relocat(?:e|ing|ed)|shift(?:ing|ed)?)\b[^.!?\n]{0,80}\b(?:different|new) state\b|\binterstate (?:move|relocation)\b|\bacross state lines?\b/i,
      /दूसरे राज्य में (जा|जा रहा|स्थानांतरित)|राज्य बदल/i,
      /வேறு மாநிலத்திற்கு (செல்|செல்ல|குடிபெயர)|மாநிலம் மாற/i,
    ],
  },
  {
    missionId: "safety",
    patterns: [
      /robbery|robbed|break[ -]?in|burglar|burglary|someone broke into|theft in progress/i,
      /चोरी|डकैती|घर में घुस/i,
      /திருட்டு|கொள்ளை|வீட்டில் புகுந்த/u,
    ],
  },
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
    safety: "I found an urgent safety need. I can show the immediate official support route and prepare a simulated police-report plan.",
    moving: "I found an interstate move. I can prepare the common address, voter, ration-portability and vehicle-update steps for review.",
  },
  hi: {
    pregnancy: "मैंने गर्भावस्था मिशन पहचाना है। कुछ गैर-संवेदनशील जानकारी से सेवाएं तैयार की जा सकती हैं।",
    college: "मैंने कॉलेज मिशन पहचाना है। छात्रवृत्ति और शैक्षणिक दस्तावेज़ तैयारी जाँची जा सकती है।",
    work: "मैंने पहला काम मिशन पहचाना है। पहचान संख्या के बिना कर और सामाजिक सुरक्षा तैयारी की जा सकती है।",
    "job-loss": "मैंने नौकरी छूटने का मिशन पहचाना है। लाभ, दावा और करियर सेवाओं की तैयारी जाँची जा सकती है।",
    business: "मैंने छोटा व्यवसाय मिशन पहचाना है। पंजीकरण, कर और वित्त तैयारी की जा सकती है।",
    grievance: "मैंने सार्वजनिक सेवा समस्या मिशन पहचाना है। सही नकली शिकायत मार्ग तैयार किया जा सकता है।",
    safety: "मैंने एक तत्काल सुरक्षा जरूरत पहचानी है। मैं तत्काल आधिकारिक सहायता मार्ग और एक सिम्युलेटेड पुलिस-रिपोर्ट योजना दिखा सकता हूँ।",
    moving: "मैंने दूसरे राज्य में स्थानांतरण पहचाना है। मैं पते, मतदाता, राशन-पोर्टेबिलिटी और वाहन अपडेट के सामान्य कदम तैयार कर सकता हूँ।",
  },
  ta: {
    pregnancy: "கர்ப்பகால தேவையை கண்டறிந்தேன். முக்கிய சேவைகளை தனிப்பட்ட அடையாளங்கள் இல்லாமல் தயார் செய்யலாம்.",
    college: "கல்லூரி தேவையை கண்டறிந்தேன். உதவித்தொகை மற்றும் கல்வி ஆவணத் தயார்நிலையை பார்க்கலாம்.",
    work: "முதல் வேலை தேவையை கண்டறிந்தேன். அடையாள எண்கள் இல்லாமல் வரி மற்றும் சமூக பாதுகாப்பை தயார் செய்யலாம்.",
    "job-loss": "வேலை இழப்பு தேவையை கண்டறிந்தேன். பயன், கோரிக்கை மற்றும் வேலைவாய்ப்பு சேவைகளை பார்க்கலாம்.",
    business: "சிறு வணிக தேவையை கண்டறிந்தேன். பதிவு, வரி மற்றும் நிதி தயார்நிலையை பார்க்கலாம்.",
    grievance: "பொது சேவை புகாரை கண்டறிந்தேன். சரியான மாதிரி புகார் வழியை தயார் செய்யலாம்.",
    safety: "அவசர பாதுகாப்பு தேவையை கண்டறிந்தேன். உடனடி அதிகாரப்பூர்வ உதவி வழியையும் காவல் புகார் மாதிரி திட்டத்தையும் காட்டலாம்.",
    moving: "மாநிலம் மாறும் தேவையை கண்டறிந்தேன். முகவரி, வாக்காளர், ரேஷன் எடுத்துச்செல்லல் மற்றும் வாகனப் புதுப்பிப்பு படிகளைத் தயாரிக்கலாம்.",
  },
};

export function safeMissionReply(
  missionId: MissionId | null,
  language: Language,
): string {
  if (missionId) return replies[language][missionId];
  if (language === "hi") {
    return "मैं इस जरूरत के लिए सही योजना बनाने को तैयार हूँ। कृपया एक वाक्य में बताएं कि क्या बदला है और यह घर, काम, पढ़ाई, स्वास्थ्य, व्यवसाय या सुरक्षा से जुड़ा है।";
  }
  if (language === "ta") {
    return "இந்த தேவைக்கான சரியான திட்டத்தை உருவாக்க நான் தயாராக இருக்கிறேன். என்ன மாறியது என்பதையும் இது வீடு, வேலை, படிப்பு, உடல்நலம், வணிகம் அல்லது பாதுகாப்பு பற்றியதா என்பதையும் ஒரு வாக்கியத்தில் சொல்லுங்கள்.";
  }
  return "I’m ready to build the right plan for this. In one sentence, tell me what changed and whether it relates to home, work, study, health, business or safety.";
}

export function casePlanReply(language: Language): string {
  if (language === "hi") return "आपकी जानकारी के आधार पर मैंने एक समीक्षा योग्य सिम्युलेटेड योजना तैयार की है।";
  if (language === "ta") return "நீங்கள் பகிர்ந்த தகவலின் அடிப்படையில் மதிப்பாய்வு செய்யக்கூடிய சிமுலேஷன் திட்டத்தைத் தயாரித்துள்ளேன்.";
  return "I prepared a reviewable simulation plan based on what you shared.";
}

function fallbackCasePlan(language: Language): AgentResponse["casePlan"] {
  if (language === "hi") {
    return {
      title: "आपकी स्थिति की योजना",
      summary: "AI उपलब्ध न होने पर भी यह सुरक्षित सिम्युलेशन आपको अगला कदम व्यवस्थित करने देता है।",
      steps: [
        { title: "लक्ष्य स्पष्ट करें", description: "आप क्या बदलना या पूरा करना चाहते हैं, उसे एक वाक्य में लिखें।" },
        { title: "ज़रूरी जानकारी जुटाएँ", description: "केवल गैर-संवेदनशील तथ्य और संभावित दस्तावेज़ों की सूची बनाएँ।" },
        { title: "सही मार्ग की पुष्टि करें", description: "कोई वास्तविक कदम उठाने से पहले आधिकारिक स्रोत या योग्य पेशेवर से जाँचें।" },
      ],
    };
  }
  if (language === "ta") {
    return {
      title: "உங்கள் சூழ்நிலைத் திட்டம்",
      summary: "AI கிடைக்காத போதும், இந்த பாதுகாப்பான சிமுலேஷன் அடுத்த படிகளை ஒழுங்குபடுத்த உதவும்.",
      steps: [
        { title: "இலக்கை தெளிவாக்குங்கள்", description: "நீங்கள் மாற்ற அல்லது முடிக்க விரும்புவதை ஒரு வாக்கியத்தில் எழுதுங்கள்." },
        { title: "தேவையான தகவலை சேருங்கள்", description: "உணர்திறன் இல்லாத தகவல்கள் மற்றும் சாத்தியமான ஆவணங்களின் பட்டியலை மட்டும் உருவாக்குங்கள்." },
        { title: "சரியான வழியை உறுதிசெய்யுங்கள்", description: "உண்மையான நடவடிக்கைக்கு முன் அதிகாரப்பூர்வ ஆதாரம் அல்லது தகுதியான நிபுணரிடம் சரிபாருங்கள்." },
      ],
    };
  }
  return {
    title: "Your situation plan",
    summary: "Even when AI is unavailable, this safe simulation helps organise a reviewable next step.",
    steps: [
      { title: "Clarify the outcome", description: "Write down what you want to change or complete in one sentence." },
      { title: "Gather what matters", description: "List only non-sensitive facts and the records you may need." },
      { title: "Confirm the right route", description: "Check an official source or qualified professional before taking any real action." },
    ],
  };
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
      casePlan: fallbackCasePlan(language),
      mode: "fallback",
      fallbackReason,
      reply: casePlanReply(language),
    };
  }

  return {
    language,
    missionId: match.missionId,
    confidence: 0.72,
    facts: [{ key: "lifeEvent", value: match.missionId }],
    casePlan: null,
    reply: safeMissionReply(match.missionId, language),
    mode: "fallback",
    fallbackReason,
  };
}
