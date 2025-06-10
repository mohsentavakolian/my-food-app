
export enum Gender {
  MALE = "male",
  FEMALE = "female",
}

export enum DietaryGoal {
  WEIGHT_LOSS = "weight_loss",
  MUSCLE_GAIN = "muscle_gain",
  MAINTENANCE = "maintenance",
}

export interface MealFeedback {
  rating?: number; // e.g., 1-5 stars
  likedAspects?: string[]; // Tags like "Spicy", "Herbal", "Crispy"
  improvementAspects?: string[]; // Tags like "Too Bland", "Too Soft"
  otherComments?: string;
}

export interface UserData {
  gender: Gender;
  height: number;
  weight: number;
  age: number;
  selectedPredefinedIllnesses: string[];
  otherIllnessDetails: string;
  dietaryGoal: DietaryGoal;
  currentMood?: string;
  currentCraving?: string;
  feedbackHistory: MealFeedback[]; 
  palateProfile?: { 
    preferredAspects: string[];
    dislikedAspects: string[];
  };
  // Athlete-specific fields
  isAthlete?: boolean;
  activityType?: string; // e.g., 'strength', 'endurance', 'mixed'
  workoutTiming?: 'pre_workout' | 'post_workout' | 'rest_day' | 'general'; // 'general' for non-specific meal times
  athleticGoal?: string; // e.g., 'performance_enhancement', 'faster_recovery'
  currentTrainingPhase?: string; // e.g., 'bulking_phase', 'cutting_phase', 'competition_prep'
  trainingPhaseGoal?: string; // User's specific goal for the current training phase
}

export enum MealTimeName {
  BREAKFAST = "صبحانه",
  LUNCH = "ناهار",
  DINNER = "شام",
  SNACK = "میان‌وعده",
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: {
    uri: string;
    title: string;
  };
}

// Types for Weekly Meal Plan
export interface PlannedMeal {
  mealType: MealTimeName;
  mealName: string;
  description?: string;
  calories?: string;
  notes?: string; // e.g., suggested fruit or drink
  preparationTime?: string;
  ingredients?: string[];
  macros?: { // Optional macronutrient information
    protein?: string; // e.g., "30 گرم"
    carbs?: string;   // e.g., "50 گرم"
    fat?: string;     // e.g., "15 گرم"
  };
}

export interface DailyPlan {
  dayOfWeek: string; // e.g., "شنبه - روز اول"
  meals: PlannedMeal[];
  dailySummary?: string; // e.g., total calories for the day or a motivational tip
  phaseNote?: string; // Note from Gemini on how this day aligns with the training phase
}

export interface WeeklyPlanResponse {
  weekSummary?: string; // Introduction or summary for the week's plan
  dailyPlans: DailyPlan[];
}