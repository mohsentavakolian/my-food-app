import { UserData, MealTimeName, WeeklyPlanResponse, PlannedMeal } from "../types";
import {
    GEMINI_MODEL_NAME, DIETARY_GOAL_OPTIONS, MOOD_OPTIONS, CRAVING_OPTIONS,
    ACTIVITY_TYPE_OPTIONS, WORKOUT_TIMING_OPTIONS, ATHLETIC_GOAL_OPTIONS, TRAINING_PHASE_OPTIONS
} from "../constants";

// توابع کمکی برای ساختن متن پرامپت (اینها بدون تغییر باقی می‌مانند)
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
  if (illnessDetailsList.length > 0) illnessInfo = illnessDetailsList.join('. ');
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
        feedbackContextSection = `\nبازخورد کاربر در مورد آخرین پیشنهاد (که بر اساس همین پروفایل بوده است):\n${feedbackParts.join('\n')}\n`;
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
        palateProfileSection = `\nپروفایل ذائقه فعلی کاربر (یادگرفته شده از بازخوردها):\n${palateParts.join('\n')}\n`;
    }
  }
  return palateProfileSection;
};
const formatTrainingPhaseInfo = (userData: UserData): string => {
    if (!userData.isAthlete || !userData.currentTrainingPhase) return "";
    let phaseStrings: string[] = ["\nاطلاعات چرخه تمرینی فعلی کاربر:"];
    phaseStrings.push(`- فاز تمرینی فعلی: ${getSimpleLabel(userData.currentTrainingPhase, TRAINING_PHASE_OPTIONS)}.`);
    if (userData.trainingPhaseGoal) phaseStrings.push(`- هدف کاربر از این فاز: ${userData.trainingPhaseGoal}.`);
    return phaseStrings.join('\n');
};
const formatAthleteInfo = (userData: UserData): string => {
    if (!userData.isAthlete) return "کاربر ورزشکار نیست یا نیاز به تغذیه ورزشی خاصی اعلام نکرده است.";
    let athleteStrings: string[] = ["کاربر ورزشکار است."];
    if (userData.activityType) athleteStrings.push(`- نوع فعالیت ورزشی اصلی: ${getSimpleLabel(userData.activityType, ACTIVITY_TYPE_OPTIONS)}.`);
    if (userData.workoutTiming) athleteStrings.push(`- زمان‌بندی این وعده نسبت به تمرین (برای تک‌وعده‌ها): ${getSimpleLabel(userData.workoutTiming, WORKOUT_TIMING_OPTIONS)}.`);
    if (userData.athleticGoal) athleteStrings.push(`- هدف کلی ورزشی: ${getSimpleLabel(userData.athleticGoal, ATHLETIC_GOAL_OPTIONS)}.`);
    athleteStrings.push(formatTrainingPhaseInfo(userData));
    return athleteStrings.join('\n');
};

// Helper برای ساختن ساختار 'contents' برای REST API
const constructRestContents = (promptText: string) => {
  // برای Gemini API REST، 'contents' باید آرایه‌ای از آبجکت‌ها باشد
  // که هر کدام 'role' (معمولاً "user") و 'parts' (آرایه‌ای با یک آبجکت text) دارند.
  return [{ role: "user", parts: [{ text: promptText }] }];
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

  // پرامپت شما دقیقاً همان پرامپت قبلی است
  const prompt = `
