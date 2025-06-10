import React, { useState, useEffect, useCallback, useRef } from 'react';
import UserInputForm from './components/UserInputForm';
import MealSuggestionCard from './components/MealSuggestionCard';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import WeeklyMealPlanDisplay from './components/WeeklyMealPlanDisplay';
import Dashboard from './components/Dashboard'; 
import { UserData, MealTimeName, MealFeedback, WeeklyPlanResponse, Gender, DietaryGoal } from './types';
import { getMealSuggestionFromGemini, getWeeklyMealPlanFromGemini, getSmartKitchenSuggestionFromGemini, getPhaseSpecificNutritionInsightsFromGemini } from './services/geminiService';
import { MEAL_TIME_THRESHOLDS, MEAL_ASPECT_TAGS } from './constants';
import { calculateBMI, calculateBMR, calculateIdealWeightRange, generateWeeklyTasteReport } from './utils/calculations'; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { jsPDF as JsPDFType } from 'jspdf';


const LOCAL_STORAGE_KEYS = {
  USER_DATA: 'geminiMealPlanner_userData',
  MEAL_SUGGESTION: 'geminiMealPlanner_mealSuggestion',
  WEEKLY_PLAN: 'geminiMealPlanner_weeklyPlan',
  SMART_KITCHEN_SUGGESTION: 'geminiMealPlanner_smartKitchenSuggestion',
  SMART_KITCHEN_INGREDIENTS: 'geminiMealPlanner_smartKitchenIngredients',
  SMART_KITCHEN_MODE_ACTIVE: 'geminiMealPlanner_smartKitchenModeActive',
  BMI: 'geminiMealPlanner_bmi',
  BMR: 'geminiMealPlanner_bmr',
  IDEAL_WEIGHT_RANGE: 'geminiMealPlanner_idealWeightRange',
  OVERWEIGHT_AMOUNT: 'geminiMealPlanner_overweightAmount',
  CURRENT_MEAL_TIME: 'geminiMealPlanner_currentMealTime',
  DASHBOARD_VISIBLE: 'geminiMealPlanner_dashboardVisible',
};

const getCurrentMealTime = (): MealTimeName => {
  const currentHour = new Date().getHours();
  if (currentHour >= MEAL_TIME_THRESHOLDS[MealTimeName.BREAKFAST][0] && currentHour <= MEAL_TIME_THRESHOLDS[MealTimeName.BREAKFAST][1]) {
    return MealTimeName.BREAKFAST;
  }
  if (currentHour >= MEAL_TIME_THRESHOLDS[MealTimeName.LUNCH][0] && currentHour <= MEAL_TIME_THRESHOLDS[MealTimeName.LUNCH][1]) {
    return MealTimeName.LUNCH;
  }
  if (currentHour >= MEAL_TIME_THRESHOLDS[MealTimeName.DINNER][0] && currentHour <= MEAL_TIME_THRESHOLDS[MealTimeName.DINNER][1]) {
    return MealTimeName.DINNER;
  }
  return MealTimeName.SNACK; 
};

const scrollToElement = (elementRef: React.RefObject<HTMLElement>, behavior: ScrollBehavior = 'smooth', block: ScrollLogicalPosition = 'start') => {
    if (elementRef && elementRef.current) {
      elementRef.current.scrollIntoView({ behavior, block });
    }
};


const StarRating: React.FC<{rating: number; onRate: (rating: number) => void; disabled?: boolean}> = ({ rating, onRate, disabled }) => {
    return (
      <div className="flex space-x-1 space-x-reverse justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !disabled && onRate(star)}
            className={`text-3xl transition-colors ${
              rating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={`امتیاز ${star} از ۵ ستاره`}
            disabled={disabled}
          >
            ★
          </button>
        ))}
      </div>
    );
};

const AspectSelector: React.FC<{
  selectedAspects: string[];
  onChange: (aspect: string) => void;
  title: string;
  availableAspects?: string[];
  disabled?: boolean;
}> = ({ selectedAspects, onChange, title, availableAspects = MEAL_ASPECT_TAGS, disabled }) => {
  return (
    <div>
      <label className="block mb-1 text-xs font-medium text-emerald-700">{title}</label>
      <div className="flex flex-wrap gap-2">
        {availableAspects.map(aspect => (
          <button
            key={aspect}
            type="button"
            onClick={() => !disabled && onChange(aspect)}
            disabled={disabled}
            className={`px-2.5 py-1.5 text-xs rounded-full border transition-all
              ${selectedAspects.includes(aspect) 
                ? 'bg-emerald-500 text-white border-emerald-500' 
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-emerald-100 hover:border-emerald-300'}
              ${disabled ? 'opacity-70 cursor-not-allowed' : ''}  
            `}
          >
            {aspect}
          </button>
        ))}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [submittedUserData, setSubmittedUserData] = useState<UserData | null>(null);
  const [mealSuggestion, setMealSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMealTime, setCurrentMealTime] = useState<MealTimeName>(getCurrentMealTime());
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmr, setBmr] = useState<number | null>(null);
  const [idealWeightRange, setIdealWeightRange] = useState<{lower: number, upper: number} | null>(null);
  const [overweightAmountKg, setOverweightAmountKg] = useState<number | null>(null);
  
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [currentLikedAspects, setCurrentLikedAspects] = useState<string[]>([]);
  const [currentImprovementAspects, setCurrentImprovementAspects] = useState<string[]>([]);
  const [currentFeedbackComment, setCurrentFeedbackComment] = useState<string>("");

  const [weeklyPlanData, setWeeklyPlanData] = useState<WeeklyPlanResponse | null>(null);
  const [isWeeklyPlanLoading, setIsWeeklyPlanLoading] = useState<boolean>(false);
  const [weeklyPlanError, setWeeklyPlanError] = useState<string | null>(null);

  const [dashboardVisible, setDashboardVisible] = useState<boolean>(false);
  const [weeklyTasteReport, setWeeklyTasteReport] = useState<string | null>(null);
  const [phaseSpecificInsights, setPhaseSpecificInsights] = useState<string | null>(null);
  const [isPhaseInsightsLoading, setIsPhaseInsightsLoading] = useState<boolean>(false);
  const [phaseInsightsError, setPhaseInsightsError] = useState<string | null>(null);


  // Smart Kitchen State
  const [smartKitchenModeActive, setSmartKitchenModeActive] = useState<boolean>(false);
  const [ingredientsInput, setIngredientsInput] = useState<string>("");
  const [smartKitchenSuggestion, setSmartKitchenSuggestion] = useState<string | null>(null);
  const [isSmartKitchenLoading, setIsSmartKitchenLoading] = useState<boolean>(false);
  const [smartKitchenError, setSmartKitchenError] = useState<string | null>(null);
  const [isSmartKitchenExporting, setIsSmartKitchenExporting] = useState<boolean>(false);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Refs for scrolling
  const mealSuggestionCardRef = useRef<HTMLDivElement>(null);
  const weeklyPlanDisplayRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const smartKitchenSectionRef = useRef<HTMLDivElement>(null);
  const smartKitchenSuggestionContentRef = useRef<HTMLDivElement>(null); // For capturing smart kitchen suggestion
  const mainErrorRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on initial mount
  useEffect(() => {
    try {
      const storedUserData = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_DATA);
      if (storedUserData) {
        let parsedUserData: Partial<UserData> = {};
        try {
          parsedUserData = JSON.parse(storedUserData);
        } catch (parseError) {
          console.error("Failed to parse UserData from localStorage:", parseError);
          throw parseError; // Re-throw to be caught by the outer catch block
        }

        const validatedUserData: UserData = {
          gender: Object.values(Gender).includes(parsedUserData.gender as Gender) ? parsedUserData.gender as Gender : Gender.MALE,
          height: typeof parsedUserData.height === 'number' && parsedUserData.height > 0 ? parsedUserData.height : 170,
          weight: typeof parsedUserData.weight === 'number' && parsedUserData.weight > 0 ? parsedUserData.weight : 70,
          age: typeof parsedUserData.age === 'number' && parsedUserData.age > 0 ? parsedUserData.age : 30,
          selectedPredefinedIllnesses: Array.isArray(parsedUserData.selectedPredefinedIllnesses) ? parsedUserData.selectedPredefinedIllnesses : [],
          otherIllnessDetails: typeof parsedUserData.otherIllnessDetails === 'string' ? parsedUserData.otherIllnessDetails : '',
          dietaryGoal: Object.values(DietaryGoal).includes(parsedUserData.dietaryGoal as DietaryGoal) ? parsedUserData.dietaryGoal as DietaryGoal : DietaryGoal.WEIGHT_LOSS,
          currentMood: typeof parsedUserData.currentMood === 'string' ? parsedUserData.currentMood : undefined,
          currentCraving: typeof parsedUserData.currentCraving === 'string' ? parsedUserData.currentCraving : undefined,
          feedbackHistory: Array.isArray(parsedUserData.feedbackHistory) ? parsedUserData.feedbackHistory : [],
          palateProfile: (parsedUserData.palateProfile && typeof parsedUserData.palateProfile === 'object' && parsedUserData.palateProfile !== null)
            ? {
                preferredAspects: Array.isArray(parsedUserData.palateProfile.preferredAspects) ? parsedUserData.palateProfile.preferredAspects : [],
                dislikedAspects: Array.isArray(parsedUserData.palateProfile.dislikedAspects) ? parsedUserData.palateProfile.dislikedAspects : [],
              }
            : { preferredAspects: [], dislikedAspects: [] },
          isAthlete: typeof parsedUserData.isAthlete === 'boolean' ? parsedUserData.isAthlete : false,
          activityType: typeof parsedUserData.activityType === 'string' ? parsedUserData.activityType : undefined,
          workoutTiming: parsedUserData.workoutTiming || 'general',
          athleticGoal: typeof parsedUserData.athleticGoal === 'string' ? parsedUserData.athleticGoal : undefined,
          currentTrainingPhase: typeof parsedUserData.currentTrainingPhase === 'string' ? parsedUserData.currentTrainingPhase : undefined,
          trainingPhaseGoal: typeof parsedUserData.trainingPhaseGoal === 'string' ? parsedUserData.trainingPhaseGoal : undefined,
        };
        setSubmittedUserData(validatedUserData);

        const storedMealSuggestion = localStorage.getItem(LOCAL_STORAGE_KEYS.MEAL_SUGGESTION);
        if (storedMealSuggestion) setMealSuggestion(storedMealSuggestion);

        const storedWeeklyPlan = localStorage.getItem(LOCAL_STORAGE_KEYS.WEEKLY_PLAN);
        if (storedWeeklyPlan) setWeeklyPlanData(JSON.parse(storedWeeklyPlan));
        
        const storedSmartKitchenSuggestion = localStorage.getItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_SUGGESTION);
        if (storedSmartKitchenSuggestion) setSmartKitchenSuggestion(storedSmartKitchenSuggestion);

        const storedSmartKitchenIngredients = localStorage.getItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_INGREDIENTS);
        if (storedSmartKitchenIngredients) setIngredientsInput(storedSmartKitchenIngredients);
        
        const storedSmartKitchenModeActive = localStorage.getItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_MODE_ACTIVE);
        if (storedSmartKitchenModeActive) setSmartKitchenModeActive(JSON.parse(storedSmartKitchenModeActive));
        
        const storedDashboardVisible = localStorage.getItem(LOCAL_STORAGE_KEYS.DASHBOARD_VISIBLE);
        if (storedDashboardVisible) setDashboardVisible(JSON.parse(storedDashboardVisible));

        const storedBmi = localStorage.getItem(LOCAL_STORAGE_KEYS.BMI);
        if (storedBmi) setBmi(JSON.parse(storedBmi));
        const storedBmr = localStorage.getItem(LOCAL_STORAGE_KEYS.BMR);
        if (storedBmr) setBmr(JSON.parse(storedBmr));
        const storedIdealWeight = localStorage.getItem(LOCAL_STORAGE_KEYS.IDEAL_WEIGHT_RANGE);
        if (storedIdealWeight) setIdealWeightRange(JSON.parse(storedIdealWeight));
        const storedOverweight = localStorage.getItem(LOCAL_STORAGE_KEYS.OVERWEIGHT_AMOUNT);
        if (storedOverweight) setOverweightAmountKg(JSON.parse(storedOverweight));
        const storedMealTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_MEAL_TIME);
        if (storedMealTime) setCurrentMealTime(storedMealTime as MealTimeName);
        else setCurrentMealTime(getCurrentMealTime());

      } else {
         setCurrentMealTime(getCurrentMealTime());
      }
    } catch (e) {
      console.error("Error loading data from localStorage:", e);
      Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      // Reset state to defaults
      setSubmittedUserData(null);
      setMealSuggestion(null);
      setWeeklyPlanData(null);
      setSmartKitchenSuggestion(null);
      setIngredientsInput("");
      setSmartKitchenModeActive(false);
      setDashboardVisible(false);
      setBmi(null);
      setBmr(null);
      setIdealWeightRange(null);
      setOverweightAmountKg(null);
      setCurrentMealTime(getCurrentMealTime());
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to localStorage effects
  useEffect(() => { if (submittedUserData) localStorage.setItem(LOCAL_STORAGE_KEYS.USER_DATA, JSON.stringify(submittedUserData)); }, [submittedUserData]);
  useEffect(() => { if (mealSuggestion) localStorage.setItem(LOCAL_STORAGE_KEYS.MEAL_SUGGESTION, mealSuggestion); else localStorage.removeItem(LOCAL_STORAGE_KEYS.MEAL_SUGGESTION)}, [mealSuggestion]);
  useEffect(() => { if (weeklyPlanData) localStorage.setItem(LOCAL_STORAGE_KEYS.WEEKLY_PLAN, JSON.stringify(weeklyPlanData)); else localStorage.removeItem(LOCAL_STORAGE_KEYS.WEEKLY_PLAN) }, [weeklyPlanData]);
  useEffect(() => { if (smartKitchenSuggestion) localStorage.setItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_SUGGESTION, smartKitchenSuggestion); else localStorage.removeItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_SUGGESTION) }, [smartKitchenSuggestion]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_INGREDIENTS, ingredientsInput); }, [ingredientsInput]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.SMART_KITCHEN_MODE_ACTIVE, JSON.stringify(smartKitchenModeActive)); }, [smartKitchenModeActive]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.DASHBOARD_VISIBLE, JSON.stringify(dashboardVisible)); }, [dashboardVisible]);
  
  useEffect(() => { if (bmi !== null) localStorage.setItem(LOCAL_STORAGE_KEYS.BMI, JSON.stringify(bmi)); else localStorage.removeItem(LOCAL_STORAGE_KEYS.BMI) }, [bmi]);
  useEffect(() => { if (bmr !== null) localStorage.setItem(LOCAL_STORAGE_KEYS.BMR, JSON.stringify(bmr)); else localStorage.removeItem(LOCAL_STORAGE_KEYS.BMR) }, [bmr]);
  useEffect(() => { if (idealWeightRange) localStorage.setItem(LOCAL_STORAGE_KEYS.IDEAL_WEIGHT_RANGE, JSON.stringify(idealWeightRange)); else localStorage.removeItem(LOCAL_STORAGE_KEYS.IDEAL_WEIGHT_RANGE) }, [idealWeightRange]);
  useEffect(() => { if (overweightAmountKg !== null) localStorage.setItem(LOCAL_STORAGE_KEYS.OVERWEIGHT_AMOUNT, JSON.stringify(overweightAmountKg)); else localStorage.removeItem(LOCAL_STORAGE_KEYS.OVERWEIGHT_AMOUNT) }, [overweightAmountKg]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_MEAL_TIME, currentMealTime); }, [currentMealTime]);


  useEffect(() => {
    if (submittedUserData && submittedUserData.feedbackHistory) {
      const report = generateWeeklyTasteReport(submittedUserData.feedbackHistory);
      setWeeklyTasteReport(report);
    }
  }, [submittedUserData?.feedbackHistory]);

  // Scroll effects
  useEffect(() => { if (mealSuggestion && mealSuggestionCardRef.current) scrollToElement(mealSuggestionCardRef);}, [mealSuggestion]);
  useEffect(() => { if (weeklyPlanData && weeklyPlanDisplayRef.current) scrollToElement(weeklyPlanDisplayRef);}, [weeklyPlanData]);
  useEffect(() => { if (smartKitchenModeActive && smartKitchenSectionRef.current) scrollToElement(smartKitchenSectionRef, 'smooth', 'center'); }, [smartKitchenModeActive]);
  useEffect(() => {
    if ((smartKitchenSuggestion || smartKitchenError) && smartKitchenSectionRef.current) {
        // Scroll to the suggestion display part, not the whole section, if suggestion is available
        if (smartKitchenSuggestionContentRef.current) {
            smartKitchenSuggestionContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            scrollToElement(smartKitchenSectionRef);
        }
    }
  }, [smartKitchenSuggestion, smartKitchenError]);
  useEffect(() => {
    if ((error && !mealSuggestion && !weeklyPlanData && !smartKitchenSuggestion) || (weeklyPlanError && !weeklyPlanData)) {
        if (mainErrorRef.current) scrollToElement(mainErrorRef);
    }
  }, [error, weeklyPlanError, mealSuggestion, weeklyPlanData, smartKitchenSuggestion]);

  // Dashboard related effects
  useEffect(() => {
    if (dashboardVisible && dashboardRef.current) {
      scrollToElement(dashboardRef);
      if (submittedUserData?.isAthlete && submittedUserData?.currentTrainingPhase && !phaseSpecificInsights && !isPhaseInsightsLoading && isOnline) {
        fetchPhaseSpecificInsights(submittedUserData);
      }
    }
  }, [dashboardVisible, submittedUserData, phaseSpecificInsights, isPhaseInsightsLoading, isOnline]);

  const fetchPhaseSpecificInsights = async (userData: UserData) => {
    if (!isOnline) {
        setPhaseInsightsError("شما آفلاین هستید. برای دریافت راهنمای تغذیه، لطفاً به اینترنت متصل شوید.");
        return;
    }
    setIsPhaseInsightsLoading(true);
    setPhaseInsightsError(null);
    try {
      const insights = await getPhaseSpecificNutritionInsightsFromGemini(userData);
      setPhaseSpecificInsights(insights);
    } catch (err: any) {
      setPhaseSpecificInsights(null);
      setPhaseInsightsError(err.message || "خطا در دریافت راهنمای تغذیه فاز تمرینی.");
    } finally {
      setIsPhaseInsightsLoading(false);
    }
  };


  const resetFeedbackFields = () => {
    setCurrentRating(0);
    setCurrentLikedAspects([]);
    setCurrentImprovementAspects([]);
    setCurrentFeedbackComment("");
  };

  const processSingleMealSuggestionRequest = async (data: UserData, mealTime: MealTimeName) => {
    if (!isOnline) {
        setError("شما آفلاین هستید. برای دریافت پیشنهاد جدید، لطفاً به اینترنت متصل شوید. می‌توانید آخرین پیشنهاد ذخیره شده را (در صورت وجود) مشاهده کنید.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    setMealSuggestion(null); 
    setWeeklyPlanData(null); 
    setWeeklyPlanError(null);

    const calculatedBmi = calculateBMI(data.height, data.weight);
    const calculatedBmr = calculateBMR(data.gender, data.weight, data.height, data.age);
    const calculatedIdealWeight = calculateIdealWeightRange(data.height);

    setBmi(calculatedBmi);
    setBmr(calculatedBmr);
    setIdealWeightRange(calculatedIdealWeight);

    if (calculatedBmi && calculatedIdealWeight && calculatedBmi > 24.9) {
      const overweight = data.weight - calculatedIdealWeight.upper;
      setOverweightAmountKg(overweight > 0 ? parseFloat(overweight.toFixed(1)) : null);
    } else {
      setOverweightAmountKg(null);
    }
    
    try {
      const suggestion = await getMealSuggestionFromGemini(data, mealTime);
      if (suggestion.startsWith("خطا در ارتباط با سرویس هوش مصنوعی:")) {
          setError(suggestion);
          setMealSuggestion(null);
      } else {
          setMealSuggestion(suggestion);
      }
    } catch (apiError: any) {
      setError(apiError.message || "یک خطای پیش‌بینی نشده در دریافت پیشنهاد رخ داد.");
      setMealSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = useCallback(async (data: UserData) => {
    const initialData: UserData = {
        ...data, 
        feedbackHistory: data.feedbackHistory || [], 
        palateProfile: data.palateProfile || { preferredAspects: [], dislikedAspects: [] }
    };
    setSubmittedUserData(initialData); 
    resetFeedbackFields();
    const mealTimeForSuggestion = getCurrentMealTime();
    setCurrentMealTime(mealTimeForSuggestion);
    setMealSuggestion(null);
    setWeeklyPlanData(null);
    setSmartKitchenSuggestion(null);
    setError(null);
    setWeeklyPlanError(null);
    setSmartKitchenError(null);

    processSingleMealSuggestionRequest(initialData, mealTimeForSuggestion);
  }, [isOnline]);

  const handleRefineSuggestion = useCallback(async () => {
    if (!submittedUserData) {
        setError("اطلاعات کاربری اولیه برای اصلاح پیشنهاد موجود نیست. لطفاً ابتدا یک پیشنهاد دریافت کنید.");
        return;
    }
    if (currentRating === 0 && currentLikedAspects.length === 0 && currentImprovementAspects.length === 0 && currentFeedbackComment.trim() === "") {
        setError("لطفاً حداقل یکی از موارد بازخورد (امتیاز، جنبه‌ها یا نظر) را وارد کنید تا پیشنهاد اصلاح شود.");
        return;
    }
    if (!isOnline) {
        setError("شما آفلاین هستید. برای اصلاح پیشنهاد، لطفاً به اینترنت متصل شوید.");
        return;
    }

    const mealTimeForSuggestion = getCurrentMealTime();
    setCurrentMealTime(mealTimeForSuggestion);
    
    const newFeedback: MealFeedback = {
        rating: currentRating > 0 ? currentRating : undefined,
        likedAspects: currentLikedAspects,
        improvementAspects: currentImprovementAspects,
        otherComments: currentFeedbackComment.trim(),
    };

    const updatedFeedbackHistory = [...(submittedUserData.feedbackHistory || []), newFeedback].slice(-5); 

    let updatedPreferredAspects = [...(submittedUserData.palateProfile?.preferredAspects || [])];
    let updatedDislikedAspects = [...(submittedUserData.palateProfile?.dislikedAspects || [])];

    currentLikedAspects.forEach(aspect => {
        if (!updatedPreferredAspects.includes(aspect)) updatedPreferredAspects.push(aspect);
        updatedDislikedAspects = updatedDislikedAspects.filter(a => a !== aspect);
    });
    currentImprovementAspects.forEach(aspect => {
        if (!updatedDislikedAspects.includes(aspect)) updatedDislikedAspects.push(aspect);
        updatedPreferredAspects = updatedPreferredAspects.filter(a => a !== aspect);
    });
    
    const updatedPalateProfile = {
        preferredAspects: Array.from(new Set(updatedPreferredAspects)), 
        dislikedAspects: Array.from(new Set(updatedDislikedAspects)),   
    };

    const dataForRefinement: UserData = {
      ...submittedUserData,
      feedbackHistory: updatedFeedbackHistory,
      palateProfile: updatedPalateProfile,
    };
    
    setSubmittedUserData(dataForRefinement); 
    processSingleMealSuggestionRequest(dataForRefinement, mealTimeForSuggestion);
  }, [submittedUserData, currentRating, currentLikedAspects, currentImprovementAspects, currentFeedbackComment, isOnline]);

  const handleGetWeeklyPlan = async () => {
    if (!submittedUserData) {
      setWeeklyPlanError("اطلاعات کاربر برای دریافت برنامه هفتگی موجود نیست. لطفاً ابتدا فرم را تکمیل کنید.");
      return;
    }
    if (!isOnline) {
        setWeeklyPlanError("شما آفلاین هستید. برای دریافت برنامه هفتگی، لطفاً به اینترنت متصل شوید. می‌توانید آخرین برنامه ذخیره شده را (در صورت وجود) مشاهده کنید.");
        setIsWeeklyPlanLoading(false);
        return;
    }
    setIsWeeklyPlanLoading(true);
    setWeeklyPlanError(null);
    setMealSuggestion(null);
    setError(null); 

    const calculatedBmi = calculateBMI(submittedUserData.height, submittedUserData.weight);
    const calculatedBmr = calculateBMR(submittedUserData.gender, submittedUserData.weight, submittedUserData.height, submittedUserData.age);
    const calculatedIdealWeight = calculateIdealWeightRange(submittedUserData.height);
    setBmi(calculatedBmi);
    setBmr(calculatedBmr);
    setIdealWeightRange(calculatedIdealWeight);
     if (calculatedBmi && calculatedIdealWeight && calculatedBmi > 24.9) {
      const overweight = submittedUserData.weight - calculatedIdealWeight.upper;
      setOverweightAmountKg(overweight > 0 ? parseFloat(overweight.toFixed(1)) : null);
    } else {
      setOverweightAmountKg(null);
    }

    try {
      const plan = await getWeeklyMealPlanFromGemini(submittedUserData);
      setWeeklyPlanData(plan);
    } catch (apiError: any) {
      setWeeklyPlanError(apiError.message || "یک خطای پیش‌بینی نشده در دریافت برنامه هفتگی رخ داد.");
      setWeeklyPlanData(null);
    } finally {
      setIsWeeklyPlanLoading(false);
    }
  };

  const handleGetSmartKitchenSuggestion = async () => {
    if (!submittedUserData) {
        setSmartKitchenError("لطفاً ابتدا اطلاعات پروفایل خود را تکمیل کنید تا بتوانیم پیشنهادی متناسب با شما ارائه دهیم.");
        return;
    }
    if (!ingredientsInput.trim()) {
        setSmartKitchenError("لطفاً مواد اولیه‌ای که در اختیار دارید را وارد کنید.");
        return;
    }
    if (!isOnline) {
        setSmartKitchenError("شما آفلاین هستید. برای دریافت پیشنهاد آشپزخانه هوشمند، لطفاً به اینترنت متصل شوید. می‌توانید آخرین پیشنهاد ذخیره شده را (در صورت وجود) مشاهده کنید.");
        setIsSmartKitchenLoading(false);
        return;
    }
    setIsSmartKitchenLoading(true);
    setSmartKitchenError(null);
    setSmartKitchenSuggestion(null);
    try {
        const suggestion = await getSmartKitchenSuggestionFromGemini(submittedUserData, ingredientsInput);
        if (suggestion.startsWith("خطا در ارتباط با سرویس هوش مصنوعی")) {
            setSmartKitchenError(suggestion);
        } else {
            setSmartKitchenSuggestion(suggestion);
        }
    } catch (apiError: any) {
        setSmartKitchenError(apiError.message || "یک خطای پیش‌بینی نشده در دریافت پیشنهاد آشپزخانه هوشمند رخ داد.");
    } finally {
        setIsSmartKitchenLoading(false);
    }
  };

  const handleStartNew = () => {
    setSubmittedUserData(null);
    setMealSuggestion(null);
    setError(null);
    setBmi(null);
    setBmr(null);
    setIdealWeightRange(null);
    setOverweightAmountKg(null);
    resetFeedbackFields();
    setCurrentMealTime(getCurrentMealTime()); 
    setWeeklyPlanData(null);
    setIsWeeklyPlanLoading(false);
    setWeeklyPlanError(null);
    setDashboardVisible(false); 
    setWeeklyTasteReport(null);
    setPhaseSpecificInsights(null);
    setIsPhaseInsightsLoading(false);
    setPhaseInsightsError(null);
    setSmartKitchenModeActive(false);
    setIngredientsInput("");
    setSmartKitchenSuggestion(null);
    setIsSmartKitchenLoading(false);
    setSmartKitchenError(null);
    setIsSmartKitchenExporting(false);

    Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_MEAL_TIME, getCurrentMealTime());
  };

    const handleExportSmartKitchenImage = async () => {
    if (!smartKitchenSuggestionContentRef.current || isSmartKitchenExporting) return;
    setIsSmartKitchenExporting(true);
    try {
      const canvas = await html2canvas(smartKitchenSuggestionContentRef.current, {
        scale: 3, // Increased scale
        backgroundColor: '#ffffff',
        onclone: (document) => {
          const exportButtons = document.getElementById('smart-kitchen-export-buttons-container');
          if (exportButtons) exportButtons.style.display = 'none';
        }
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `پیشنهاد-آشپزخانه-هوشمند.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting smart kitchen image:", error);
      setSmartKitchenError("خطا در خروجی گرفتن تصویر پیشنهاد آشپزخانه.");
    } finally {
      setIsSmartKitchenExporting(false);
    }
  };

  const handleExportSmartKitchenPDF = async () => {
    if (!smartKitchenSuggestionContentRef.current || isSmartKitchenExporting) return;
    setIsSmartKitchenExporting(true);
    try {
      const canvas = await html2canvas(smartKitchenSuggestionContentRef.current, {
        scale: 3, // Increased scale
        backgroundColor: '#ffffff',
        onclone: (document) => {
          const exportButtons = document.getElementById('smart-kitchen-export-buttons-container');
          if (exportButtons) exportButtons.style.display = 'none';
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const pdf = new (jsPDF as any)({
        orientation: imgWidth > imgHeight ? 'l' : 'p',
        unit: 'px',
        format: [imgWidth, imgHeight],
      }) as JsPDFType;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`پیشنهاد-آشپزخانه-هوشمند.pdf`);
    } catch (error) {
      console.error("Error exporting smart kitchen PDF:", error);
      setSmartKitchenError("خطا در خروجی گرفتن PDF پیشنهاد آشپزخانه.");
    } finally {
      setIsSmartKitchenExporting(false);
    }
  };


  const atLeastOneFeedbackFieldFilled = currentRating > 0 || currentLikedAspects.length > 0 || currentImprovementAspects.length > 0 || currentFeedbackComment.trim() !== "";

  const InstagramPromo = () => (
    <p className="text-xs text-emerald-700/90 mt-2 text-center">
        پیج اینستاگرام من رو فالو کن و در صورت هر گونه سوال و مشکلی به دایرکت پیام بده: 
        <a 
            href="https://www.instagram.com/Ghazalbayat.fitlife" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
        >
             @Ghazalbayat.fitlife
        </a>
    </p>
  );

  const toggleDashboard = () => {
    const newDashboardVisible = !dashboardVisible;
    setDashboardVisible(newDashboardVisible);
    if (newDashboardVisible) setSmartKitchenModeActive(false); 
  }

  const toggleSmartKitchenMode = () => {
    const newSmartKitchenModeActive = !smartKitchenModeActive;
    setSmartKitchenModeActive(newSmartKitchenModeActive);
    if (newSmartKitchenModeActive) { 
        setDashboardVisible(false); 
    } else { 
        setSmartKitchenError(null);
    }
  };
  
  const formatSmartKitchenSuggestion = (text: string): React.ReactNode => {
    return text.split('\n').map((line, index, arr) => {
        const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return (
            <React.Fragment key={index}>
                <span dangerouslySetInnerHTML={{ __html: boldedLine }} />
                {index < arr.length - 1 && <br />}
            </React.Fragment>
        );
    });
  };

  let mainContent;
  if (smartKitchenModeActive) {
    mainContent = (
        <div ref={smartKitchenSectionRef} className="mt-6 p-4 md:p-6 bg-white rounded-xl shadow-2xl animate-fadeIn w-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-emerald-700">آشپزخانه هوشمند من</h2>
                <button
                    onClick={() => toggleSmartKitchenMode()}
                    className="text-gray-500 hover:text-gray-700 transition-colors text-sm py-1 px-2 rounded hover:bg-gray-100"
                >
                    بازگشت
                </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                مواد اولیه‌ای که در حال حاضر در آشپزخانه دارید را وارد کنید (مثلاً: سینه مرغ، قارچ، فلفل دلمه‌ای، پیاز) تا با در نظر گرفتن پروفایل شما، یک پیشنهاد غذایی هوشمند دریافت کنید.
            </p>
            <textarea
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
                placeholder="مواد اولیه خود را اینجا وارد کنید، با کاما یا خط جدید از هم جدا کنید..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors mb-4"
                disabled={isSmartKitchenLoading || isSmartKitchenExporting}
            />
            <button
                onClick={handleGetSmartKitchenSuggestion}
                disabled={isSmartKitchenLoading || !submittedUserData || !ingredientsInput.trim() || isSmartKitchenExporting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
            >
                {isSmartKitchenLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>در حال یافتن پیشنهاد...</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span>دریافت پیشنهاد با این مواد</span>
                    </>
                )}
            </button>
            {!submittedUserData && <p className="text-xs text-yellow-600 mt-2 text-center">برای دریافت پیشنهاد شخصی‌سازی شده، لطفاً ابتدا اطلاعات پروفایل خود را از طریق فرم اصلی تکمیل و ارسال کنید.</p>}
            
            <div className="smart-kitchen-suggestion-display"> {/* Container for suggestion content and export buttons */}
              {isSmartKitchenLoading && <LoadingSpinner />}
              {smartKitchenError && <ErrorMessage message={smartKitchenError} />}
              {smartKitchenSuggestion && !isSmartKitchenLoading && !smartKitchenError && (
                  <div className="mt-6 animate-fadeIn">
                      <div ref={smartKitchenSuggestionContentRef} className="p-4 bg-emerald-50 rounded-lg shadow"> {/* Content to be captured */}
                          <h3 className="text-lg font-semibold text-emerald-700 mb-3">پیشنهاد هوشمند برای شما:</h3>
                          <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                              {formatSmartKitchenSuggestion(smartKitchenSuggestion)}
                          </div>
                      </div>
                      {/* Export Buttons for Smart Kitchen */}
                      <div id="smart-kitchen-export-buttons-container" className="mt-4 pt-3 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end gap-3">
                          <button
                              onClick={handleExportSmartKitchenImage}
                              disabled={isSmartKitchenExporting || isSmartKitchenLoading}
                              className="flex items-center justify-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isSmartKitchenExporting ? (
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rtl:ml-2 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              )}
                              <span>خروجی تصویر (PNG)</span>
                          </button>
                          <button
                              onClick={handleExportSmartKitchenPDF}
                              disabled={isSmartKitchenExporting || isSmartKitchenLoading}
                              className="flex items-center justify-center px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isSmartKitchenExporting ? (
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rtl:ml-2 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              )}
                              <span>خروجی PDF</span>
                          </button>
                      </div>
                  </div>
              )}
            </div>
        </div>
    );
  } else if (dashboardVisible && submittedUserData) {
    mainContent = (
      <div ref={dashboardRef}>
        <Dashboard 
          userData={submittedUserData} 
          weeklyTasteReport={weeklyTasteReport} 
          onClose={() => setDashboardVisible(false)}
          phaseSpecificInsights={phaseSpecificInsights}
          isPhaseInsightsLoading={isPhaseInsightsLoading}
          phaseInsightsError={phaseInsightsError}
        />
      </div>
    );
  } else if (isLoading || isWeeklyPlanLoading) {
    mainContent = <LoadingSpinner />;
  } else if (error && (!mealSuggestion && !weeklyPlanData)) { 
    mainContent = <div ref={mainErrorRef}><ErrorMessage message={error} /></div>;
  } else if (weeklyPlanError && !weeklyPlanData) { 
    mainContent = <div ref={mainErrorRef}><ErrorMessage message={weeklyPlanError} /></div>;
  } else if (weeklyPlanData && submittedUserData) { 
    mainContent = <div ref={weeklyPlanDisplayRef}><WeeklyMealPlanDisplay plan={weeklyPlanData} /></div>;
  } else if (mealSuggestion && submittedUserData) { 
    mainContent = (
      <>
        <div ref={mealSuggestionCardRef}>
          <MealSuggestionCard 
            suggestion={mealSuggestion} 
            mealTime={currentMealTime}
            bmi={bmi}
            bmr={bmr}
            idealWeightRange={idealWeightRange}
            overweightAmountKg={overweightAmountKg}
          />
        </div>
        {error && <div ref={mainErrorRef} className="mt-4"><ErrorMessage message={error} /></div>}
        <div className="mt-6 p-4 sm:p-6 bg-green-50 rounded-lg shadow animate-fadeIn space-y-4">
          <h3 className="text-lg font-semibold text-emerald-700 text-center mb-3">بازخورد شما در مورد این پیشنهاد چیست؟</h3>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-emerald-700 text-center">امتیاز کلی:</label>
            <StarRating rating={currentRating} onRate={setCurrentRating} disabled={isLoading} />
          </div>
          <AspectSelector
            selectedAspects={currentLikedAspects}
            onChange={(aspect) => setCurrentLikedAspects(prev => 
              prev.includes(aspect) ? prev.filter(a => a !== aspect) : [...prev, aspect]
            )}
            title="چه چیزهایی را دوست داشتید؟ (اختیاری)"
            disabled={isLoading}
          />
          <AspectSelector
            selectedAspects={currentImprovementAspects}
            onChange={(aspect) => setCurrentImprovementAspects(prev =>
              prev.includes(aspect) ? prev.filter(a => a !== aspect) : [...prev, aspect]
            )}
            title="چه چیزهایی می‌توانست بهتر باشد؟ (اختیاری)"
            disabled={isLoading}
          />
          <div>
            <label htmlFor="userFeedbackComment" className="block mb-1.5 text-sm font-medium text-emerald-700">
              نظر یا جزئیات بیشتر (اختیاری):
            </label>
            <textarea
              id="userFeedbackComment"
              value={currentFeedbackComment}
              onChange={(e) => setCurrentFeedbackComment(e.target.value)}
              rows={2}
              placeholder="مثلاً: ترکیب ادویه‌ها عالی بود ولی کمی شور بود..."
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              aria-label="نظر یا جزئیات بیشتر در مورد پیشنهاد فعلی"
              disabled={isLoading}
            ></textarea>
          </div>
          <button
            onClick={handleRefineSuggestion}
            disabled={isLoading || !atLeastOneFeedbackFieldFilled}
            className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>دریافت پیشنهاد اصلاح‌شده با این بازخورد</span>
          </button>
        </div>
      </>
    );
  } else { 
     mainContent = (
      <div className={`animate-slideUp ${error || weeklyPlanError ? 'mt-8' : ''}`}>
        <UserInputForm onSubmit={handleFormSubmit} isLoading={isLoading || isWeeklyPlanLoading} initialData={submittedUserData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-emerald-200 selection:text-emerald-800">
      <header className="my-8 text-center w-full max-w-3xl"> 
       <div className="flex justify-between items-center space-x-2 rtl:space-x-reverse">
          {submittedUserData && (
            <button
              onClick={toggleSmartKitchenMode}
              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-full transition-colors"
              title="آشپزخانه هوشمند"
              aria-label="ورود به حالت آشپزخانه هوشمند"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V5m0 4V5m0 4c0-1.1.9-2 2-2h0c1.1 0 2 .9 2 2v0m-4 0c0 1.1-.9 2-2 2h0c-1.1 0-2-.9-2-2v0" style={{ stroke: '#34d399', opacity: 0.7 }} />
              </svg>
            </button>
          )}
          {!submittedUserData && <div className="w-9 h-9"></div>} 

          <div className="flex-grow text-center">
            <div className="flex justify-center items-center space-x-3 space-x-reverse mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.864l-1.071-1.071a7.5 7.5 0 01-1.628-9.9L12 3.636l2.7 2.7a7.5 7.5 0 01-1.628 9.9L12 21.864zM12 12.364a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" style={{ stroke: '#34d399', opacity: 0.6}} />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-emerald-800">پیشنهاد هوشمند و تکاملی غذا</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">تغذیه سالم، زندگی سالم، با طعمی که شما دوست دارید!</p>
            <InstagramPromo /> 
          </div>
          {submittedUserData && (
            <button 
              onClick={toggleDashboard} 
              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-full transition-colors"
              title="داشبورد من"
              aria-label="مشاهده داشبورد من"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {!submittedUserData && <div className="w-9 h-9"></div>} 
        </div>
      </header>

      <main className="w-full max-w-2xl px-2">
        {mainContent}
        
        {!smartKitchenModeActive && !dashboardVisible && submittedUserData && !weeklyPlanData && !isLoading && !isWeeklyPlanLoading && ( 
            <div className="mt-4">
                 <p className="text-center text-sm text-gray-600 mb-2">یا می‌توانید برای یک هفته کامل برنامه دریافت کنید:</p>
                 <button
                    onClick={handleGetWeeklyPlan}
                    disabled={isWeeklyPlanLoading || isLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 transition-colors duration-150 ease-in-out flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-60"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>دریافت برنامه غذایی هفتگی</span>
                </button>
            </div>
        )}
        
        {!smartKitchenModeActive && !dashboardVisible && (mealSuggestion || weeklyPlanData || smartKitchenSuggestion || error || weeklyPlanError || smartKitchenError || submittedUserData) && (
             <button
                onClick={handleStartNew}
                className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-150 ease-in-out flex items-center justify-center space-x-2 space-x-reverse"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0015.357 2M9 15h9" />
                </svg>
                <span>شروع مجدد و پاک کردن همه اطلاعات</span>
            </button>
        )}
      </main>
      
      {!isOnline && (
        <div className="fixed bottom-4 right-4 rtl:right-auto rtl:left-4 bg-yellow-500 text-white p-3 rounded-lg shadow-lg text-sm z-50 animate-fadeIn" role="status" aria-live="assertive">
          شما آفلاین هستید. برخی قابلیت‌ها محدود شده‌اند.
        </div>
      )}

      <footer className="my-8 text-center text-gray-500 text-sm space-y-1">
        <p>&copy; {new Date().getFullYear()} ارائه شده توسط هوش مصنوعی Gemini. تمامی حقوق محفوظ است.</p>
        <p>این پیشنهادات و محاسبات جایگزین توصیه پزشک یا متخصص تغذیه نیست.</p>
      </footer>

    </div>
  );
};

export default App;