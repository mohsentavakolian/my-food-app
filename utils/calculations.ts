import { Gender, MealFeedback } from '../types';

/**
 * Calculates Body Mass Index (BMI).
 * @param heightCm User's height in centimeters.
 * @param weightKg User's weight in kilograms.
 * @returns BMI value, or null if inputs are invalid.
 */
export const calculateBMI = (heightCm: number, weightKg: number): number | null => {
  if (heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation.
 * @param gender User's gender.
 * @param weightKg User's weight in kilograms.
 * @param heightCm User's height in centimeters.
 * @param age User's age in years.
 * @returns BMR value, or null if inputs are invalid.
 */
export const calculateBMR = (
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number | null => {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    return null;
  }

  if (gender === Gender.MALE) {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
};

/**
 * Calculates the ideal weight range for a given height based on healthy BMI.
 * @param heightCm User's height in centimeters.
 * @returns An object with 'lower' and 'upper' bounds for ideal weight in kg, or null if height is invalid.
 */
export const calculateIdealWeightRange = (heightCm: number): { lower: number; upper: number } | null => {
  if (heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  const lowerBmi = 18.5;
  const upperBmi = 24.9;

  const lowerWeight = lowerBmi * (heightM * heightM);
  const upperWeight = upperBmi * (heightM * heightM);

  return {
    lower: parseFloat(lowerWeight.toFixed(1)),
    upper: parseFloat(upperWeight.toFixed(1)),
  };
};

/**
 * Generates a weekly taste report based on user's feedback history.
 * For simplicity, this version considers all feedback history, not just the last week.
 * @param feedbackHistory Array of MealFeedback objects.
 * @returns A string summarizing the most liked aspects, or null if no relevant feedback.
 */
export const generateWeeklyTasteReport = (feedbackHistory: MealFeedback[]): string | null => {
  if (!feedbackHistory || feedbackHistory.length === 0) {
    return "هنوز بازخورد کافی برای تهیه گزارش ذائقه ثبت نشده است.";
  }

  const likedAspectsCounts: { [key: string]: number } = {};
  let totalFeedbacksWithLikedAspects = 0;

  feedbackHistory.forEach(feedback => {
    if (feedback.likedAspects && feedback.likedAspects.length > 0) {
      totalFeedbacksWithLikedAspects++;
      feedback.likedAspects.forEach(aspect => {
        likedAspectsCounts[aspect] = (likedAspectsCounts[aspect] || 0) + 1;
      });
    }
  });

  if (totalFeedbacksWithLikedAspects === 0) {
    return "در بازخوردهای اخیر، جنبه‌های دوست‌داشتنی خاصی انتخاب نشده است.";
  }

  // Sort aspects by frequency
  const sortedLikedAspects = Object.entries(likedAspectsCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3); // Take top 3

  if (sortedLikedAspects.length === 0) {
    return "جنبه‌های دوست‌داشتنی پرتکراری در بازخوردهای شما یافت نشد.";
  }

  const topAspectsText = sortedLikedAspects.map(([aspect, count]) => `${aspect} (${count} بار تکرار)`).join('، ');

  return `گزارش ذائقه شما: به نظر می‌رسد به طعم‌ها و بافت‌های زیر علاقه بیشتری نشان داده‌اید: ${topAspectsText}. عالیه! به ارائه بازخورد ادامه دهید تا پیشنهادات هوشمندتری دریافت کنید.`;
};
