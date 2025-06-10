import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserData, MealTimeName, DietaryGoal, MealFeedback, WeeklyPlanResponse, PlannedMeal } from "../types";
import { 
    GEMINI_MODEL_NAME, DIETARY_GOAL_OPTIONS, MOOD_OPTIONS, CRAVING_OPTIONS,
    ACTIVITY_TYPE_OPTIONS, WORKOUT_TIMING_OPTIONS, ATHLETIC_GOAL_OPTIONS, TRAINING_PHASE_OPTIONS
} from "../constants";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const callGeminiWithRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 2, // Total 3 attempts (1 initial + 2 retries)
  delayMs = 1000 
): Promise<T> => {
  let attempts = 0;
  while (true) { // Loop will be broken by return or throw
    try {
      return await apiCall();
    } catch (error) {
      attempts++;
      // Check if it's an error we shouldn't retry (e.g., client-side errors like 4xx)
      // For now, we retry on any error, but this could be refined if error types are distinguishable
      const isRetriableError = true; // Placeholder for more specific error checking

      if (!isRetriableError || attempts >= maxRetries + 1) { // +1 because attempts starts at 0 for first try
        console.error(`Gemini API call failed after ${attempts} attempt(s):`, error);
        throw error; // Re-throw the error after all retries fail or if not retriable
      }
      const currentDelay = delayMs * Math.pow(2, attempts - 1); // Exponential backoff
      console.warn(`Gemini API call attempt ${attempts} failed. Retrying in ${currentDelay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
};


const getSimpleLabel = (value: string | undefined, options: {value: string, label: string}[]): string => {
    if (!value) return "مشخص نشده";
    const option = options.find(opt => opt.value === value);
    return option ? option.label : "نامشخص";
};

const formatIllnessInfo = (userData: UserData): string => {
  let illnessInfo = "ندارد";
  const illnessDetailsList = [];
  if (userData.selectedPredefinedIllnesses && userData.selectedPredefinedIllnesses.length > 0) {
    illnessDetailsList.push(`موارد انتخاب شده: ${userData.selectedPredefinedIllnesses.join('، ')}`);
  }
  if (userData.otherIllnessDetails && userData.otherIllnessDetails.trim() !== "") {
    illnessDetailsList.push(`توضیحات دیگر: ${userData.otherIllnessDetails.trim()}`);
  }

  if (illnessDetailsList.length > 0) {
    illnessInfo = illnessDetailsList.join('. ');
  }
  return illnessInfo;
};

const formatFeedbackContext = (userData: UserData): string => {
  let feedbackContextSection = "";
  const latestFeedback = userData.feedbackHistory && userData.feedbackHistory.length > 0 
                       ? userData.feedbackHistory[userData.feedbackHistory.length - 1] 
                       : null;

  if (latestFeedback) {
    const ratingText = latestFeedback.rating ? `امتیاز: ${latestFeedback.rating} از ۵.` : "";
    const likedText = latestFeedback.likedAspects && latestFeedback.likedAspects.length > 0 
                    ? `نکات مثبت از نظر کاربر: ${latestFeedback.likedAspects.join('، ')}.` 
                    : "";
    const improvedText = latestFeedback.improvementAspects && latestFeedback.improvementAspects.length > 0 
                       ? `موارد قابل بهبود از نظر کاربر: ${latestFeedback.improvementAspects.join('، ')}.` 
                       : "";
    const commentsText = latestFeedback.otherComments ? `نظر تکمیلی کاربر: ${latestFeedback.otherComments}` : "";
    
    const feedbackParts = [ratingText, likedText, improvedText, commentsText].filter(Boolean);
    if (feedbackParts.length > 0) {
        feedbackContextSection = `
بازخورد کاربر در مورد آخرین پیشنهاد (که بر اساس همین پروفایل بوده است):
${feedbackParts.join('\n')}
`;
    }
  }
  return feedbackContextSection;
};

const formatPalateProfile = (userData: UserData): string => {
  let palateProfileSection = "";
  if (userData.palateProfile) {
    const preferred = userData.palateProfile.preferredAspects.length > 0 
                    ? `جنبه‌های طعمی و بافتی مورد علاقه کاربر: ${userData.palateProfile.preferredAspects.join('، ')}.`
                    : "";
    const disliked = userData.palateProfile.dislikedAspects.length > 0
                   ? `جنبه‌های طعمی و بافتی که کاربر کمتر می‌پسندد: ${userData.palateProfile.dislikedAspects.join('، ')}.`
                   : "";
    const palateParts = [preferred, disliked].filter(Boolean);
    if (palateParts.length > 0) {
        palateProfileSection = `
پروفایل ذائقه فعلی کاربر (یادگرفته شده از بازخوردها):
${palateParts.join('\n')}
`;
    }
  }
  return palateProfileSection;
};

const formatTrainingPhaseInfo = (userData: UserData): string => {
    if (!userData.isAthlete || !userData.currentTrainingPhase) {
        return ""; // No specific training phase info to add
    }
    let phaseStrings: string[] = ["\nاطلاعات چرخه تمرینی فعلی کاربر:"];
    phaseStrings.push(`- فاز تمرینی فعلی: ${getSimpleLabel(userData.currentTrainingPhase, TRAINING_PHASE_OPTIONS)}.`);
    if (userData.trainingPhaseGoal) {
        phaseStrings.push(`- هدف کاربر از این فاز: ${userData.trainingPhaseGoal}.`);
    }
    return phaseStrings.join('\n');
};


const formatAthleteInfo = (userData: UserData): string => {
    if (!userData.isAthlete) {
        return "کاربر ورزشکار نیست یا نیاز به تغذیه ورزشی خاصی اعلام نکرده است.";
    }
    let athleteStrings: string[] = ["کاربر ورزشکار است."];
    if (userData.activityType) athleteStrings.push(`- نوع فعالیت ورزشی اصلی: ${getSimpleLabel(userData.activityType, ACTIVITY_TYPE_OPTIONS)}.`);
    if (userData.workoutTiming) athleteStrings.push(`- زمان‌بندی این وعده نسبت به تمرین (برای تک‌وعده‌ها): ${getSimpleLabel(userData.workoutTiming, WORKOUT_TIMING_OPTIONS)}.`);
    if (userData.athleticGoal) athleteStrings.push(`- هدف کلی ورزشی: ${getSimpleLabel(userData.athleticGoal, ATHLETIC_GOAL_OPTIONS)}.`);
    
    athleteStrings.push(formatTrainingPhaseInfo(userData)); // Add training phase info

    return athleteStrings.join('\n');
};

export const getMealSuggestionFromGemini = async (
  userData: UserData,
  mealTime: MealTimeName
): Promise<string> => {
  const genderText = userData.gender === "male" ? "مرد" : "زن";
  const dietaryGoalText = getSimpleLabel(userData.dietaryGoal, DIETARY_GOAL_OPTIONS);
  const moodText = getSimpleLabel(userData.currentMood, MOOD_OPTIONS);
  const cravingText = getSimpleLabel(userData.currentCraving, CRAVING_OPTIONS);
  const illnessInfo = formatIllnessInfo(userData);
  const feedbackContextSection = formatFeedbackContext(userData);
  const palateProfileSection = formatPalateProfile(userData);
  const athleteInfoSection = formatAthleteInfo(userData);

  const prompt = `
شما یک مشاور تغذیه هوشمند، خلاق، همدل، یادگیرنده و متخصص در سطح جهانی هستید. لطفاً بر اساس اطلاعات زیر، یک پیشنهاد وعده غذایی سالم، رژیمی و متناسب با اصول تغذیه مدرن برای فرد ارائه دهید.

اطلاعات فرد:
- جنسیت: ${genderText}
- قد: ${userData.height} سانتی‌متر
- وزن: ${userData.weight} کیلوگرم
- سن: ${userData.age} سال
- هدف از رژیم غذایی (کلی): ${dietaryGoalText}
- سابقه بیماری خاص یا وضعیت ویژه: ${illnessInfo}
- وعده غذایی مورد نظر (بر اساس ساعت فعلی): ${mealTime}
- اطلاعات احساسی و هوس لحظه‌ای (در صورت ارائه):
    - احساس فعلی: ${moodText}
    - هوس غذایی: ${cravingText}
- اطلاعات ورزشی:
${athleteInfoSection} 
${palateProfileSection}
${feedbackContextSection}

وعده پیشنهادی باید شامل موارد زیر باشد:
1.  نام غذا (مشخص کنید ایرانی است یا بین‌المللی و از کدام کشور/منطقه)
2.  مواد لازم به طور خلاصه (مقدار حدودی برای یک نفر)
3.  طرز تهیه ساده و گام به گام
4.  حدود کالری کل وعده (اگر امکان‌پذیر است)
5.  **ماکرومغذی‌ها:** لطفاً میزان تقریبی پروتئین، کربوهیدرات و چربی (به گرم) برای این وعده را تخمین بزنید. این بخش بسیار مهم است، به خصوص اگر کاربر ورزشکار باشد. خروجی این بخش باید به این صورت باشد: **ماکرومغذی‌ها:** پروتئین: [مقدار] گرم، کربوهیدرات: [مقدار] گرم، چربی: [مقدار] گرم.
6.  نکات تغذیه‌ای یا فواید اصلی غذا (اختیاری)
7.  یک توضیح کوتاه که چرا این غذا با حس و حال یا هوس کاربر (در صورت ارائه) همخوانی دارد.
8.  توضیح مختصر و شفاف که چگونه این پیشنهاد جدید، بازخورد قبلی و پروفایل ذائقه کاربر (در صورت وجود)، اطلاعات ورزشی او (شامل فاز تمرینی فعلی اگر مشخص شده) را مد نظر قرار داده است. این بخش بسیار مهم است.
9.  پیشنهاد یک نوع میوه و یک نوع نوشیدنی سالم و متناسب با وعده غذایی (اختیاری و در صورت تناسب).

ملاحظات مهم و دستورالعمل‌های کلیدی برای انتخاب غذا:
- **تکامل پیشنهاد بر اساس بازخورد و پروفایل (اولویت بالا):** اگر بازخورد یا پروفایل ذائقه‌ای وجود دارد، پیشنهاد فعلی باید یک گام تکاملی باشد و به آن پاسخ دهد.
- **توجه به اطلاعات ورزشی (در صورت وجود، اولویت بالا):**
    - اگر کاربر ورزشکار است، نوع فعالیت، هدف ورزشی، **فاز تمرینی فعلی (مانند دوره حجم، کات، آماده‌سازی مسابقه)** و زمان‌بندی این وعده نسبت به تمرین (pre/post/rest/general) را به دقت در نظر بگیرید.
    - برای وعده‌های قبل از تمرین، کربوهیدرات‌های با کیفیت برای تامین انرژی را در اولویت قرار دهید.
    - برای وعده‌های بعد از تمرین، بر پروتئین برای ریکاوری و عضله‌سازی و همچنین کربوهیدرات برای بازسازی ذخایر تاکید کنید.
    - برای روزهای استراحت یا وعده‌های عمومی، یک وعده متعادل متناسب با هدف کلی و فاز تمرینی ورزشکار پیشنهاد دهید.
    - بر اساس فاز تمرینی (مثلاً حجم یا کات)، توزیع کالری و ماکرومغذی‌ها را تنظیم کنید.
    - تخمین ماکرومغذی‌ها (پروتئین، کربوهیدرات، چربی) برای ورزشکاران بسیار حیاتی است. لطفاً این مورد را با دقت انجام دهید و در قالب مشخص شده در بخش 5 پاسخ ارائه دهید.
- **توجه ویژه به حس و حال و هوس کاربر:** (پس از در نظر گرفتن بازخورد، پروفایل ذائقه و اطلاعات ورزشی).
- **اولویت اصلی با غذاهای ایرانی:** مگر اینکه غذای بین‌المللی با شرایط خاص کاربر (از جمله پروفایل ورزشی و فاز تمرینی) تناسب بهتری داشته باشد.
- **پیشنهاد میوه و نوشیدنی:** متناسب با وعده، فصل، هدف رژیمی و وضعیت ورزشی.
- غذا باید با هدف رژیمی کلی فرد (${dietaryGoalText}) متناسب باشد.
- از مواد اولیه در دسترس و رایج (در حد امکان) استفاده شود.
- دستور پخت پیچیده نباشد.
- شرایط خاص (بیماری، آلرژی، پریودی، شیردهی) حتماً لحاظ شود.

لطفاً پاسخ خود را به زبان فارسی روان، در قالب متن ساختاریافته (عنوان‌بندی دقیق برای هر بخش از ۱ تا ۹) و به صورت کامل ارائه دهید.
  `;

  try {
    const apiFn = () => ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });
    const response: GenerateContentResponse = await callGeminiWithRetry(apiFn);
    return String(response.text); 
  } catch (error) {
    console.error("Error calling Gemini API for single meal:", error);
    if (error instanceof Error) {
        return `خطا در ارتباط با سرویس هوش مصنوعی: ${error.message}`;
    }
    return "خطا در ارتباط با سرویس هوش مصنوعی: یک خطای ناشناخته رخ داده است.";
  }
};

export const getWeeklyMealPlanFromGemini = async (
  userData: UserData
): Promise<WeeklyPlanResponse> => {
  const genderText = userData.gender === "male" ? "مرد" : "زن";
  const dietaryGoalText = getSimpleLabel(userData.dietaryGoal, DIETARY_GOAL_OPTIONS);
  const moodText = getSimpleLabel(userData.currentMood, MOOD_OPTIONS); 
  const cravingText = getSimpleLabel(userData.currentCraving, CRAVING_OPTIONS); 
  const illnessInfo = formatIllnessInfo(userData);
  const feedbackContextSection = formatFeedbackContext(userData); 
  const palateProfileSection = formatPalateProfile(userData);
  const athleteInfoSection = formatAthleteInfo(userData); // Includes general athlete info and training phase

  const prompt = `
شما یک برنامه‌ریز تغذیه هوشمند، خلاق و متخصص در سطح جهانی هستید. لطفاً بر اساس اطلاعات کاربر، یک برنامه غذایی کامل و متنوع برای ۷ روز آینده (شامل صبحانه، ناهار، شام و یک میان‌وعده سالم برای هر روز) ارائه دهید.

**دستورالعمل‌های حیاتی برای تولید خروجی JSON:**
1.  **خروجی فقط JSON:** پاسخ شما باید **فقط و فقط یک آبجکت JSON کاملاً معتبر** باشد. هیچ متن اضافی، کامنت، یا توضیحی خارج از این ساختار JSON ارسال نکنید.
2.  **دابل کوتیشن برای کلیدها و رشته‌ها:** تمامی نام‌های خصوصیت (کلیدها) و تمامی مقادیر رشته‌ای باید الزاماً داخل دابل کوتیشن ("") قرار گیرند.
3.  **فیلدهای اختیاری:**
    *   برای فیلدهای متنی اختیاری (مانند 'description', 'calories', 'notes', 'preparationTime', 'dailySummary', 'weekSummary', 'phaseNote'): اگر اطلاعاتی ندارید، **فیلد را به طور کامل از آبجکت JSON حذف کنید یا مقدار آن را \`null\` قرار دهید.**
    *   برای فیلد 'ingredients' (آرایه اختیاری از رشته‌ها): اگر اطلاعاتی ندارید، **یک آرایه خالی \`[]\` قرار دهید.**
    *   برای فیلد 'macros' (آبجکت اختیاری با فیلدهای 'protein', 'carbs', 'fat' که همگی رشته‌های اختیاری هستند):
        *   اگر اطلاعات ماکرو وجود ندارد، **فیلد 'macros' را به طور کامل حذف کنید یا مقدار آن را \`null\` قرار دهید.**
        *   اگر برای یک ماکرو خاص (مثلاً پروتئین) اطلاعاتی ندارید ولی برای بقیه دارید، آن فیلد خاص ماکرو را حذف کنید یا \`null\` قرار دهید (مثال: \`"macros": {"carbs": "۵۰ گرم", "fat": "۱۵ گرم"}\`، بدون 'protein').
    *   **به هیچ وجه عبارت "(اختیاری)" یا مشابه آن را در مقادیر JSON قرار ندهید.**
4.  **کاماها:** کاماها به درستی بین عناصر آرایه و خصوصیات آبجکت قرار گیرند و هیچ کامای اضافی در انتهای آرایه‌ها یا آبجکت‌ها نباشد.
5.  **Escape کردن کاراکترهای خاص:** در مقادیر رشته‌ای، کاراکترهای خاص مانند دابل کوتیشن یا بک‌اسلش را به درستی escape کنید.

**اطلاعات کاربر:**
- جنسیت: ${genderText}
- قد: ${userData.height} سانتی‌متر
- وزن: ${userData.weight} کیلوگرم
- سن: ${userData.age} سال
- هدف از رژیم غذایی (کلی): ${dietaryGoalText}
- سابقه بیماری خاص یا وضعیت ویژه: ${illnessInfo}
- اطلاعات احساسی و هوس لحظه‌ای (برای شروع هفته یا به‌طور کلی در نظر بگیرید):
    - احساس فعلی: ${moodText}
    - هوس غذایی: ${cravingText}
- اطلاعات ورزشی (برای کل هفته در نظر گرفته شود، روزهای تمرین و استراحت را تفکیک کنید، به خصوص **فاز تمرینی فعلی** مانند دوره حجم، کات، و غیره):
${athleteInfoSection} 
${palateProfileSection}
${feedbackContextSection}

**ساختار دقیق JSON مورد انتظار (برای آبجکتی از نوع 'WeeklyPlanResponse'):**
\`\`\`json
{
  "weekSummary": "یک خلاصه نمونه برای هفته غذایی کاربر، شامل نکات کلی، اهداف ورزشی و چگونگی همسویی برنامه با فاز تمرینی فعلی او.",
  "dailyPlans": [
    {
      "dayOfWeek": "شنبه - روز اول (روز تمرین قدرتی - فاز حجم)",
      "meals": [
        {
          "mealType": "${MealTimeName.BREAKFAST}",
          "mealName": "املت پروتئینی با سبزیجات و نان جو",
          "description": "صبحانه‌ای کامل برای تامین انرژی و پروتئین، مناسب برای شروع یک روز تمرینی در فاز حجم.",
          "calories": "حدود ۴۵۰ کالری",
          "notes": "میوه: نصف گریپ‌فروت. نوشیدنی: چای سبز.",
          "preparationTime": "۱۵ دقیقه",
          "ingredients": ["تخم مرغ ۳ عدد", "اسفناج ۱ مشت", "قارچ ۳ عدد", "نان جو ۲ کف دست"],
          "macros": {
            "protein": "۳۰ گرم",
            "carbs": "۴۰ گرم",
            "fat": "۲۰ گرم"
          }
        },
        // ... سایر وعده‌های روز اول ...
        {
          "mealType": "${MealTimeName.LUNCH}",
          "mealName": "سینه مرغ گریل شده با کینوا و سالاد فصل",
          "description": "ناهار سرشار از پروتئین و فیبر، مناسب برای ریکاوری بعد از تمرین قدرتی یا تامین انرژی برای ادامه روز در فاز حجم.",
          "calories": "حدود ۵۵۰ کالری",
          "macros": {
            "protein": "۴۵ گرم",
            "carbs": "۵۵ گرم",
            "fat": "۱۵ گرم"
          },
          "notes": "نوشیدنی: آب با لیمو و نعنا.",
          "preparationTime": "۲۵ دقیقه",
          "ingredients": ["سینه مرغ ۱۵۰ گرم", "کینوا پخته شده ۱ پیمانه", "کاهو، خیار، گوجه به میزان لازم", "روغن زیتون ۱ قاشق چایخوری"]
        }
      ],
      "dailySummary": "امروز تمرین قدرتی خوبی داشتی! پروتئین و کالری کافی برای حمایت از عضله‌سازی دریافت کردی. به ریکاوری و خواب کافی توجه کن.",
      "phaseNote": "برنامه امروز با هدف افزایش دریافت کالری و پروتئین برای حمایت از فاز حجم شما طراحی شده است."
    },
    {
      "dayOfWeek": "یکشنبه - روز دوم (روز استراحت فعال یا کاردیو سبک - فاز حجم)",
      "meals": [
        // ... وعده‌های روز دوم ...
      ],
      "dailySummary": "امروز روز استراحت فعال است. بدنت را با غذاهای مغذی تغذیه کن تا برای تمرین فردا آماده شوی.",
      "phaseNote": "وعده‌های امروز کالری کنترل شده‌تری دارند اما همچنان پروتئین کافی برای ریکاوری در فاز حجم فراهم می‌کنند."
    }
    // ... سایر روزهای هفته (دوشنبه تا جمعه) با ساختار مشابه و غذاهای متنوع ...
  ]
}
\`\`\`
**ملاحظات کلی برای برنامه غذایی هفتگی:**
- **اولویت با غذاهای ایرانی:** برنامه باید عمدتاً شامل غذاهای اصیل و متنوع ایرانی باشد، مگر اینکه نیازهای ورزشی کاربر، فاز تمرینی او، یا پروفایل ذائقه‌اش، گزینه بین‌المللی بهتری را ایجاب کند.
- **تنوع و تعادل:** در طول هفته از تکرار زیاد غذاها پرهیز کنید و تعادل درشت مغذی‌ها (با توجه به نیاز ورزشکار و فاز تمرینی) و ریزمغذی‌ها را در نظر بگیرید.
- **شخصی‌سازی کامل:** با تمامی اطلاعات کاربر سازگار باشد (هدف رژیمی، بیماری‌ها، پروفایل ذائقه، اطلاعات ورزشی شامل فاز تمرینی).
- **برنامه ورزشی و فاز تمرینی:** اگر کاربر ورزشکار است و فاز تمرینی مشخص کرده، برنامه غذایی باید منعکس‌کننده نیازهای آن فاز باشد (مثلاً کالری بیشتر و پروتئین بالاتر در فاز حجم، یا کالری کنترل شده در فاز کات). روزهای تمرین (با توجه به نوع و شدت احتمالی) و روزهای استراحت را تفکیک کنید. ماکرومغذی‌ها برای هر وعده باید تخمین زده شود و در فیلد \`macros\` قرار گیرد. یک \`phaseNote\` برای هر روز ارائه دهید.
- **توجه به شرایط خاص:** بیماری‌ها، آلرژی‌ها و وضعیت‌های خاص (پریودی، شیردهی) حتماً لحاظ شود.
- **میان‌وعده‌ها:** سالم و ساده باشند و با هدف کلی و نیازهای ورزشی و فاز تمرینی همخوانی داشته باشند.

**مجدداً تاکید می‌شود: خروجی باید فقط و فقط یک رشته JSON معتبر و کامل، بدون هیچ متن یا توضیحی خارج از آن باشد. به دقت ساختار نمونه و قوانین JSON را رعایت کنید، به خصوص در مورد فیلدهای 'macros' و 'phaseNote'.**
`;

  try {
    const apiFn = () => ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
    const response = await callGeminiWithRetry(apiFn);

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    if (!jsonStr.startsWith("{") || !jsonStr.endsWith("}")) {
        console.error("Gemini response for weekly plan is not a JSON object:", jsonStr);
        throw new Error("پاسخ دریافت شده از سرویس هوش مصنوعی برای برنامه هفتگی، فرمت JSON معتبر ندارد.");
    }
    // console.log("Raw JSON string for weekly plan:", jsonStr); // For debugging

    return JSON.parse(jsonStr) as WeeklyPlanResponse;

  } catch (error) {
    console.error("Error calling Gemini API for weekly plan or parsing JSON:", error);
    let errorMessage = "خطا در دریافت برنامه هفتگی از سرویس هوش مصنوعی.";
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes("json") || error.message.toLowerCase().includes("parse")) {
        errorMessage = `خطا در پردازش پاسخ برنامه هفتگی. لطفاً دوباره تلاش کنید. جزئیات: ${error.message}`;
      } else {
        errorMessage += ` جزئیات: ${error.message}`;
      }
    }
     if (error instanceof SyntaxError) { 
        errorMessage = `خطا در تجزیه پاسخ JSON برنامه هفتگی از سرویس. لطفاً دوباره تلاش کنید. جزئیات: ${error.message}.`;
    }
    throw new Error(errorMessage);
  }
};


export const getSmartKitchenSuggestionFromGemini = async (
  userData: UserData,
  ingredientsText: string
): Promise<string> => {
  const genderText = userData.gender === "male" ? "مرد" : "زن";
  const dietaryGoalText = getSimpleLabel(userData.dietaryGoal, DIETARY_GOAL_OPTIONS);
  const illnessInfo = formatIllnessInfo(userData);
  const palateProfileSection = formatPalateProfile(userData);
  const athleteInfoSection = formatAthleteInfo(userData); // Athlete info for smart kitchen

  const prompt = `
شما یک آشپز هوشمند و خلاق هستید که به کاربر کمک می‌کنید با مواد اولیه موجود در آشپزخانه‌اش، غذاهای سالم و خوشمزه تهیه کند.
لطفاً بر اساس **مواد اولیه اصلی ارائه شده توسط کاربر** و همچنین **پروفایل کامل او** (شامل اطلاعات فیزیکی، هدف رژیمی، وضعیت سلامتی، پروفایل ذائقه، و اطلاعات ورزشی شامل فاز تمرینی)، یک یا دو پیشنهاد غذایی ارائه دهید.

برای هر پیشنهاد، لطفاً موارد زیر را به صورت واضح و در قالبی خوانا ارائه دهید:
1.  **نام غذا**
2.  **مواد لازم:** تاکید بر استفاده حداکثری از مواد اولیه کاربر. اگر نیاز به مواد افزودنی جزئی (مانند نمک، فلفل، روغن، یا یک سبزی رایج) هست، ذکر کنید.
3.  **طرز تهیه ساده و گام به گام.**
4.  **توضیح مختصر:** چرا این غذا با مواد اولیه موجود و پروفایل کاربر (به خصوص هدف رژیمی، پروفایل ذائقه، و نیازهای ورزشی و فاز تمرینی در صورت وجود) مناسب است.
5.  **حدود کالری (اختیاری):** اگر امکان محاسبه تقریبی وجود دارد.
6.  **ماکرومغذی‌ها (اختیاری، اما برای ورزشکاران بسیار مفید):** اگر کاربر ورزشکار است یا اطلاعات ورزشی ارائه داده، لطفاً میزان تقریبی پروتئین، کربوهیدرات و چربی (به گرم) را تخمین بزنید. (مثال: **ماکرومغذی‌ها:** پروتئین: ۲۵ گرم، کربوهیدرات: ۴۰ گرم، چربی: ۱۰ گرم).
7.  **نکات اضافی یا جایگزین‌ها (اختیاری).**

**اطلاعات کاربر:**
- جنسیت: ${genderText}
- قد: ${userData.height} سانتی‌متر
- وزن: ${userData.weight} کیلوگرم
- سن: ${userData.age} سال
- هدف از رژیم غذایی (کلی): ${dietaryGoalText}
- سابقه بیماری خاص یا وضعیت ویژه: ${illnessInfo}
- اطلاعات ورزشی:
${athleteInfoSection}
${palateProfileSection}

**مواد اولیه اصلی که کاربر در اختیار دارد:**
${ingredientsText}

**ملاحظات مهم:**
- **اولویت با مواد اولیه کاربر:** پیشنهادها باید به گونه‌ای باشند که بیشترین استفاده را از مواد اولیه ذکر شده توسط کاربر ببرند.
- **شخصی‌سازی بر اساس پروفایل کامل کاربر:** حتماً هدف رژیمی، وضعیت سلامتی، ترجیحات ذائقه‌ای، و نیازهای ورزشی و فاز تمرینی کاربر را در نظر بگیرید.
- **سادگی و عملی بودن:** دستور پخت‌ها باید ساده و قابل اجرا باشند.
- **سلامت محور:** غذاهای پیشنهادی باید سالم و مغذی باشند.
- **خلاقیت:** سعی کنید پیشنهادهای جذاب و متنوعی ارائه دهید.

لطفاً پاسخ خود را به زبان فارسی روان و در قالب متن ساختاریافته برای هر پیشنهاد ارائه دهید.
  `;

  try {
    const apiFn = () => ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: { // Lower latency for smart kitchen
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    const response: GenerateContentResponse = await callGeminiWithRetry(apiFn);
    return String(response.text);
  } catch (error) {
    console.error("Error calling Gemini API for Smart Kitchen:", error);
    if (error instanceof Error) {
        return `خطا در ارتباط با سرویس هوش مصنوعی برای آشپزخانه هوشمند: ${error.message}`;
    }
    return "خطا در ارتباط با سرویس هوش مصنوعی (آشپزخانه هوشمند): یک خطای ناشناخته رخ داده است.";
  }
};


export const getPhaseSpecificNutritionInsightsFromGemini = async (userData: UserData): Promise<string> => {
  if (!userData.isAthlete || !userData.currentTrainingPhase) {
    return "برای دریافت راهنمای تغذیه تخصصی، لطفاً ابتدا حالت ورزشکار را فعال کرده و فاز تمرینی خود را مشخص کنید.";
  }

  const trainingPhaseText = getSimpleLabel(userData.currentTrainingPhase, TRAINING_PHASE_OPTIONS);
  const trainingPhaseGoalText = userData.trainingPhaseGoal ? `با هدف: ${userData.trainingPhaseGoal}` : "";

  const prompt = `
شما یک متخصص تغذیه ورزشی در سطح جهانی هستید. کاربری که ورزشکار است، اطلاعات زیر را در مورد فاز تمرینی فعلی خود ارائه داده است:
- فاز تمرینی فعلی: ${trainingPhaseText}
- هدف کاربر از این فاز (در صورت ارائه): ${trainingPhaseGoalText}
- سایر اطلاعات پروفایل کاربر (برای زمینه کلی در نظر بگیرید، اما تمرکز بر فاز باشد):
    - جنسیت: ${userData.gender === "male" ? "مرد" : "زن"}
    - هدف کلی رژیمی: ${getSimpleLabel(userData.dietaryGoal, DIETARY_GOAL_OPTIONS)}
    - نوع فعالیت ورزشی اصلی: ${getSimpleLabel(userData.activityType, ACTIVITY_TYPE_OPTIONS)}
    - هدف کلی ورزشی: ${getSimpleLabel(userData.athleticGoal, ATHLETIC_GOAL_OPTIONS)}

لطفاً بر اساس **فاز تمرینی فعلی (${trainingPhaseText})** و هدف کاربر از این فاز، یک راهنمای تغذیه تخصصی، کاربردی و خلاصه (حداکثر ۳ تا ۴ پاراگراف کوتاه یا یک لیست از نکات کلیدی) ارائه دهید. این راهنما باید شامل موارد زیر باشد:
1.  **استراتژی‌های کلی توزیع ماکرومغذی‌ها** (پروتئین، کربوهیدرات، چربی) و کالری مناسب برای این فاز خاص. (مثلاً: "در فاز حجم، تمرکز بر دریافت کالری مازاد سالم و پروتئین کافی برای عضله‌سازی است...")
2.  **مواد غذایی کلیدی و نمونه‌های غذایی** که مصرف آن‌ها در این فاز توصیه می‌شود.
3.  **اشتباهات رایج تغذیه‌ای** که ورزشکاران معمولاً در این فاز مرتکب می‌شوند و باید از آن‌ها پرهیز کرد.
4.  **نکات مهم دیگر** مرتبط با تغذیه در این فاز (مثلاً اهمیت هیدراتاسیون، مکمل‌های احتمالی مفید - با ذکر اینکه مشورت با متخصص لازم است، یا زمان‌بندی وعده‌ها).

پاسخ شما باید به زبان فارسی روان، علمی اما قابل فهم، و کاملاً متمرکز بر راهنمایی عملی برای فاز تمرینی مشخص شده باشد. از کلی‌گویی پرهیز کنید و نکات کاربردی ارائه دهید.
  `;

  try {
    const apiFn = () => ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });
    const response: GenerateContentResponse = await callGeminiWithRetry(apiFn);
    return String(response.text);
  } catch (error) {
    console.error("Error calling Gemini API for Phase Specific Insights:", error);
    if (error instanceof Error) {
      return `خطا در دریافت راهنمای تغذیه از سرویس هوش مصنوعی: ${error.message}`;
    }
    return "خطا در دریافت راهنمای تغذیه: یک خطای ناشناخته رخ داده است.";
  }
};