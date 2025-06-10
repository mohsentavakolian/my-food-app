
import { Gender, MealTimeName, DietaryGoal } from "./types";

export const GENDER_OPTIONS = [
  { value: Gender.MALE, label: "مرد" },
  { value: Gender.FEMALE, label: "زن" },
];

export const DIETARY_GOAL_OPTIONS = [
  { value: DietaryGoal.WEIGHT_LOSS, label: "کاهش وزن" },
  { value: DietaryGoal.MUSCLE_GAIN, label: "افزایش حجم (عضله)" },
  { value: DietaryGoal.MAINTENANCE, label: "حفظ وزن فعلی" },
];

export const MOOD_OPTIONS = [
  { value: "", label: "انتخاب کنید (اختیاری)"},
  { value: "آرام و ریلکس", label: "آرام و ریلکس" },
  { value: "پرانرژی و شاداب", label: "پرانرژی و شاداب" },
  { value: "کمی خسته یا بی‌حوصله", label: "کمی خسته یا بی‌حوصله" },
  { value: "تحت استرس یا مضطرب", label: "تحت استرس یا مضطرب" },
  { value: "به دنبال حس خوب و راحتی", label: "به دنبال حس خوب و راحتی" },
];

export const CRAVING_OPTIONS = [
  { value: "", label: "انتخاب کنید (اختیاری)"},
  { value: "یک چیز شیرین و سالم", label: "یک چیز شیرین و سالم" },
  { value: "یک چیز شور و دلچسب", label: "یک چیز شور و دلچسب" },
  { value: "یک غذای گرم و آرامش‌بخش", label: "یک غذای گرم و آرامش‌بخش" },
  { value: "یک چیز سبک و تازه", label: "یک چیز سبک و تازه" },
  { value: "یک چیز ترد و کرانچی", label: "یک چیز ترد و کرانچی" },
  { value: "بدون هوس خاصی", label: "بدون هوس خاصی" },
];

export const MEAL_ASPECT_TAGS: string[] = [
  "طعم تند", "طعم شیرین", "طعم ترش", "طعم شور", "طعم اومامی",
  "بافت نرم", "بافت ترد", "بافت آبدار", "بافت خامه ای",
  "گیاهی", "گوشتی", "مرغ", "دریایی",
  "سبک و تازه", "گرم و آرامش بخش", "سنگین و سیرکننده",
  "عطر و بوی خوب", "ظاهر جذاب", "سریع و آسان"
];


export const MEAL_TIME_THRESHOLDS: { [key in MealTimeName]: [number, number] } = {
  [MealTimeName.BREAKFAST]: [5, 9], // 5:00 - 9:59
  [MealTimeName.LUNCH]: [12, 15],   // 12:00 - 15:59
  [MealTimeName.DINNER]: [18, 21],  // 18:00 - 21:59
  [MealTimeName.SNACK]: [0, 23],    // Default/fallback
};

export const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

export const PREDEFINED_ILLNESS_OPTIONS: string[] = [
  "دیابت",
  "فشار خون بالا",
  "بیماری قلبی",
  "بیماری کلیوی",
  "آلرژی گلوتن",
  "آلرژی لاکتوز",
  "مشکلات گوارشی",
  "پرخوری عصبی",
  "دوران پریودی",
  "دوران شیر دهی",
  "دوران بارداری", // Added "دوران بارداری"
];

// Options for Age (e.g., 10 to 90 years)
export const AGE_OPTIONS = Array.from({ length: 81 }, (_, i) => ({
  value: (i + 10).toString(),
  label: `${i + 10} سال`,
}));

// Options for Height (e.g., 120cm to 210cm)
export const HEIGHT_OPTIONS = Array.from({ length: 91 }, (_, i) => ({
  value: (i + 120).toString(),
  label: `${i + 120} سانتی‌متر`,
}));

// Options for Weight (e.g., 40kg to 150kg)
export const WEIGHT_OPTIONS = Array.from({ length: 111 }, (_, i) => ({
  value: (i + 40).toString(),
  label: `${i + 40} کیلوگرم`,
}));

// Athlete Mode Options
export const ATHLETE_OPTIONS = [
    { value: "no", label: "خیر، ورزشکار نیستم / نیاز به تغذیه ورزشی ندارم" },
    { value: "yes", label: "بله، ورزشکارم و به تغذیه تخصصی نیاز دارم" },
];

export const ACTIVITY_TYPE_OPTIONS = [
    { value: "", label: "نوع فعالیت ورزشی خود را انتخاب کنید" },
    { value: "strength", label: "قدرتی (بدنسازی، وزنه‌برداری)" },
    { value: "endurance", label: "استقامتی (دویدن، دوچرخه‌سواری، شنا)" },
    { value: "mixed", label: "ترکیبی (کراس‌فیت، ورزش‌های تیمی)" },
    { value: "flexibility", label: "انعطاف‌پذیری (یوگا، پیلاتس)" },
    { value: "other", label: "سایر موارد" },
];

export const WORKOUT_TIMING_OPTIONS = [
    { value: "general", label: "وعده غذایی عادی روزانه (بدون ارتباط مستقیم با تمرین)" },
    { value: "pre_workout", label: "قبل از تمرین (۱ تا ۲ ساعت قبل)" },
    { value: "post_workout", label: "بعد از تمرین (تا ۲ ساعت بعد)" },
    { value: "rest_day", label: "روز استراحت (بدون تمرین شدید)" },
];

export const ATHLETIC_GOAL_OPTIONS = [
    { value: "", label: "هدف اصلی ورزشی خود را انتخاب کنید" },
    { value: "muscle_gain", label: "افزایش توده عضلانی (حجم)" },
    { value: "fat_loss", label: "کاهش چربی بدن (کات)" },
    { value: "performance_enhancement", label: "بهبود عملکرد ورزشی" },
    { value: "faster_recovery", label: "ریکاوری سریع‌تر پس از تمرین" },
    { value: "endurance_improvement", label: "افزایش استقامت" },
    { value: "strength_increase", label: "افزایش قدرت" },
    { value: "general_fitness", label: "حفظ تناسب اندام و سلامت عمومی ورزشی" },
];

export const TRAINING_PHASE_OPTIONS = [
    { value: "", label: "فاز تمرینی فعلی خود را انتخاب کنید" },
    { value: "bulking", label: "دوره عضله‌سازی / حجم (Bulking)" },
    { value: "cutting", label: "دوره چربی‌سوزی / کات (Cutting)" },
    { value: "maintenance_athlete", label: "حفظ ترکیب بدنی فعلی (ورزشکار)" },
    { value: "competition_prep", label: "آماده‌سازی برای مسابقه" },
    { value: "endurance_base", label: "افزایش استقامت عمومی / پایه" },
    { value: "strength_block", label: "دوره تمرکز بر افزایش قدرت" },
    { value: "recovery_off_season", label: "ریکاوری فعال / خارج از فصل" },
    { value: "general_athletic_improvement", label: "بهبود عمومی عملکرد ورزشی (بدون فاز خاص)" },
];
