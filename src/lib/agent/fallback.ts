import type { AgentResponse, Language, MissionId } from "./schemas";

type MissionPattern = Readonly<{
  missionId: MissionId;
  patterns: readonly RegExp[];
}>;

const safetyPatterns: readonly RegExp[] = [
  /robbery|robbed|break[ -]?in|burglar|burglary|someone broke into|theft in progress/i,
  /चोरी|डकैती|घर में घुस/i,
  /திருட்டு|கொள்ளை|வீட்டில் புகுந்த/u,
];

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
    patterns: safetyPatterns,
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
    pregnancy: "I can help prepare maternity benefits, delivery support and birth-registration readiness. I just need a few details.",
    college: "I can help you get ready for scholarships and academic-document access on DigiLocker.",
    work: "I can help prepare PAN, tax and workplace social-security readiness for your new work.",
    "job-loss": "I can help you check provident-fund, insurance and career-service support after a job loss.",
    business: "I can help prepare registration, tax and finance readiness for your business.",
    grievance: "I can help structure this into a clear grievance for CPGRAMS or the National Consumer Helpline.",
    safety: "Your safety comes first. Once you're safe, I can also help prepare a police-report checklist.",
    moving: "I can help prepare the common address, voter, ration-portability and vehicle-update steps for your move.",
  },
  hi: {
    pregnancy: "मातृत्व लाभ, प्रसव सहायता और जन्म-पंजीकरण की तैयारी में मदद कर सकता हूँ। कुछ जानकारी चाहिए।",
    college: "छात्रवृत्ति और DigiLocker पर शैक्षणिक दस्तावेज़ों की तैयारी में मदद कर सकता हूँ।",
    work: "आपके नए काम के लिए PAN, कर और सामाजिक सुरक्षा तैयारी में मदद कर सकता हूँ।",
    "job-loss": "नौकरी जाने के बाद भविष्य निधि, बीमा और करियर सेवाओं की जाँच में मदद कर सकता हूँ।",
    business: "आपके व्यवसाय के लिए पंजीकरण, कर और वित्त तैयारी में मदद कर सकता हूँ।",
    grievance: "आपकी शिकायत को CPGRAMS या राष्ट्रीय उपभोक्ता हेल्पलाइन के लिए स्पष्ट रूप से तैयार करने में मदद कर सकता हूँ।",
    safety: "आपकी सुरक्षा सबसे पहले है। सुरक्षित होने के बाद मैं पुलिस रिपोर्ट की तैयारी में भी मदद कर सकता हूँ।",
    moving: "मैं पता, मतदाता, राशन पोर्टेबिलिटी और वाहन अपडेट जैसे सामान्य कदम तैयार करने में मदद कर सकता हूँ।",
  },
  ta: {
    pregnancy: "மகப்பேறு உதவி, பிரசவ ஆதரவு மற்றும் பிறப்புப் பதிவு தயார்நிலையில் உதவ முடியும். சில விவரங்கள் தேவை.",
    college: "உதவித்தொகை மற்றும் DigiLocker வழியாக கல்வி ஆவணத் தயார்நிலையில் உதவ முடியும்.",
    work: "உங்கள் புதிய வேலைக்கான PAN, வரி மற்றும் சமூகப் பாதுகாப்பு தயார்நிலையில் உதவ முடியும்.",
    "job-loss": "வேலை இழப்புக்குப் பிறகு EPF, காப்பீடு மற்றும் வேலைவாய்ப்பு சேவைகளை சரிபார்க்க உதவ முடியும்.",
    business: "உங்கள் தொழிலுக்கான பதிவு, வரி மற்றும் நிதி தயார்நிலையில் உதவ முடியும்.",
    grievance: "உங்கள் புகாரை CPGRAMS அல்லது தேசிய நுகர்வோர் உதவி மையத்திற்கு தெளிவாக தயார் செய்ய உதவ முடியும்.",
    safety: "உங்கள் பாதுகாப்பே முதன்மை. பாதுகாப்பாக இருந்த பிறகு காவல் புகார் தயார்நிலையிலும் உதவ முடியும்.",
    moving: "முகவரி, வாக்காளர் பதிவு, ரேஷன் இடமாற்றம் மற்றும் வாகனப் புதுப்பிப்பு ஆகிய பொதுவான படிகளைத் தயார் செய்ய உதவ முடியும்.",
  },
};

export function isSafetyMessage(message: string): boolean {
  return safetyPatterns.some((pattern) => pattern.test(message));
}

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
  if (language === "hi") return "आपकी जानकारी के आधार पर मैंने आपके लिए एक कार्य योजना तैयार की है।";
  if (language === "ta") return "நீங்கள் பகிர்ந்த தகவலின் அடிப்படையில் உங்களுக்கான செயல் திட்டத்தைத் தயாரித்துள்ளேன்.";
  return "Based on what you shared, I've put together an action plan for you.";
}

function fallbackCasePlan(language: Language): AgentResponse["casePlan"] {
  if (language === "hi") {
    return {
      title: "आपकी स्थिति के लिए योजना",
      summary: "आपने जो साझा किया, उसके आधार पर यह योजना अगला कदम व्यवस्थित करने में मदद करती है।",
      steps: [
        { title: "लक्ष्य स्पष्ट करें", description: "आप क्या बदलना या पूरा करना चाहते हैं, उसे एक वाक्य में लिखें।" },
        { title: "ज़रूरी जानकारी जुटाएँ", description: "केवल गैर-संवेदनशील तथ्य और संभावित दस्तावेज़ों की सूची बनाएँ।" },
        { title: "सही मार्ग की पुष्टि करें", description: "कोई कदम उठाने से पहले आधिकारिक स्रोत या योग्य पेशेवर से जाँचें।" },
      ],
    };
  }
  if (language === "ta") {
    return {
      title: "உங்கள் சூழ்நிலைக்கான திட்டம்",
      summary: "நீங்கள் பகிர்ந்ததின் அடிப்படையில் இந்தத் திட்டம் அடுத்த படியை ஒழுங்குபடுத்த உதவும்.",
      steps: [
        { title: "இலக்கை தெளிவாக்குங்கள்", description: "நீங்கள் மாற்ற அல்லது முடிக்க விரும்புவதை ஒரு வாக்கியத்தில் எழுதுங்கள்." },
        { title: "தேவையான தகவலை சேருங்கள்", description: "உணர்திறன் இல்லாத தகவல்கள் மற்றும் சாத்தியமான ஆவணங்களின் பட்டியலை மட்டும் உருவாக்குங்கள்." },
        { title: "சரியான வழியை உறுதிசெய்யுங்கள்", description: "நடவடிக்கை எடுப்பதற்கு முன் அதிகாரப்பூர்வ ஆதாரம் அல்லது தகுதியான நிபுணரிடம் சரிபாருங்கள்." },
      ],
    };
  }
  return {
    title: "A plan for your situation",
    summary: "Based on what you shared, this plan helps you organise the next step.",
    steps: [
      { title: "Clarify the outcome", description: "Write down what you want to change or complete in one sentence." },
      { title: "Gather what matters", description: "List only non-sensitive facts and the records you may need." },
      { title: "Confirm the right route", description: "Check an official source or qualified professional before taking any action." },
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
