import React, { useState, useRef, useEffect } from 'react';
import { UserData, Gender, DietaryGoal } from '../types';
import { 
    GENDER_OPTIONS, PREDEFINED_ILLNESS_OPTIONS, DIETARY_GOAL_OPTIONS, 
    MOOD_OPTIONS, CRAVING_OPTIONS, AGE_OPTIONS, HEIGHT_OPTIONS, WEIGHT_OPTIONS,
    ATHLETE_OPTIONS, ACTIVITY_TYPE_OPTIONS, WORKOUT_TIMING_OPTIONS, ATHLETIC_GOAL_OPTIONS,
    TRAINING_PHASE_OPTIONS
} from '../constants';

interface UserInputFormProps {
  onSubmit: (data: UserData) => void;
  isLoading: boolean;
  initialData?: UserData | null; // Added initialData prop
}

const UserInputForm: React.FC<UserInputFormProps> = ({ onSubmit, isLoading, initialData }) => {
  const [gender, setGender] = useState<Gender>(initialData?.gender || Gender.MALE);
  const [height, setHeight] = useState<string>(initialData?.height.toString() || '170'); 
  const [weight, setWeight] = useState<string>(initialData?.weight.toString() || '70');  
  const [age, setAge] = useState<string>(initialData?.age.toString() || '30');      
  const [selectedPredefinedIllnesses, setSelectedPredefinedIllnesses] = useState<string[]>(initialData?.selectedPredefinedIllnesses || []);
  const [otherIllnessDetails, setOtherIllnessDetails] = useState<string>(initialData?.otherIllnessDetails || '');
  const [dietaryGoal, setDietaryGoal] = useState<DietaryGoal>(initialData?.dietaryGoal || DietaryGoal.WEIGHT_LOSS);
  const [currentMood, setCurrentMood] = useState<string>(initialData?.currentMood || '');
  const [currentCraving, setCurrentCraving] = useState<string>(initialData?.currentCraving || '');
  
  // Athlete state
  const [isAthlete, setIsAthlete] = useState<boolean>(initialData?.isAthlete || false);
  const [activityType, setActivityType] = useState<string>(initialData?.activityType || '');
  const [workoutTiming, setWorkoutTiming] = useState<UserData['workoutTiming']>(initialData?.workoutTiming || 'general');
  const [athleticGoal, setAthleticGoal] = useState<string>(initialData?.athleticGoal || '');
  const [currentTrainingPhase, setCurrentTrainingPhase] = useState<string>(initialData?.currentTrainingPhase || '');
  const [trainingPhaseGoal, setTrainingPhaseGoal] = useState<string>(initialData?.trainingPhaseGoal || '');


  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for focus management
  const ageRef = useRef<HTMLSelectElement>(null);
  const heightRef = useRef<HTMLSelectElement>(null);
  const weightRef = useRef<HTMLSelectElement>(null);
  const dietaryGoalRef = useRef<HTMLSelectElement>(null);
  const activityTypeRef = useRef<HTMLSelectElement>(null);
  const workoutTimingRef = useRef<HTMLSelectElement>(null);
  const athleticGoalRef = useRef<HTMLSelectElement>(null);
  const currentTrainingPhaseRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (initialData) {
        setGender(initialData.gender);
        setHeight(initialData.height.toString());
        setWeight(initialData.weight.toString());
        setAge(initialData.age.toString());
        setSelectedPredefinedIllnesses(initialData.selectedPredefinedIllnesses || []);
        setOtherIllnessDetails(initialData.otherIllnessDetails || '');
        setDietaryGoal(initialData.dietaryGoal);
        setCurrentMood(initialData.currentMood || '');
        setCurrentCraving(initialData.currentCraving || '');
        setIsAthlete(initialData.isAthlete || false);
        setActivityType(initialData.activityType || '');
        setWorkoutTiming(initialData.workoutTiming || 'general');
        setAthleticGoal(initialData.athleticGoal || '');
        setCurrentTrainingPhase(initialData.currentTrainingPhase || '');
        setTrainingPhaseGoal(initialData.trainingPhaseGoal || '');
    }
  }, [initialData]);


  const handlePredefinedIllnessChange = (illness: string) => {
    setSelectedPredefinedIllnesses(prev =>
      prev.includes(illness) ? prev.filter(i => i !== illness) : [...prev, illness]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const numHeight = parseFloat(height);
    const numWeight = parseFloat(weight);
    const numAge = parseInt(age, 10);

    if (!height || numHeight < 50 || numHeight > 250) newErrors.height = "قد معتبر انتخاب کنید (بین ۵۰ تا ۲۵۰ سانتی‌متر).";
    if (!weight || numWeight < 20 || numWeight > 250) newErrors.weight = "وزن معتبر انتخاب کنید (بین ۲۰ تا ۲۵۰ کیلوگرم).";
    if (!age || numAge < 1 || numAge > 120) newErrors.age = "سن معتبر انتخاب کنید (بین ۱ تا ۱۲۰ سال).";
    if (!dietaryGoal) newErrors.dietaryGoal = "لطفاً هدف خود را از این وعده غذایی انتخاب کنید.";

    if (isAthlete) {
        if (!activityType) newErrors.activityType = "لطفاً نوع فعالیت ورزشی خود را انتخاب کنید.";
        // workoutTiming has a default 'general', so it's always set.
        if (!athleticGoal) newErrors.athleticGoal = "لطفاً هدف اصلی ورزشی خود را انتخاب کنید.";
        if (!currentTrainingPhase) newErrors.currentTrainingPhase = "لطفاً فاز تمرینی فعلی خود را انتخاب کنید.";
    }
    
    setErrors(newErrors);
    const formIsValid = Object.keys(newErrors).filter(key => !!newErrors[key]).length === 0;
    
    if (!formIsValid) {
        if (newErrors.age && ageRef.current) ageRef.current.focus();
        else if (newErrors.height && heightRef.current) heightRef.current.focus();
        else if (newErrors.weight && weightRef.current) weightRef.current.focus();
        else if (newErrors.dietaryGoal && dietaryGoalRef.current) dietaryGoalRef.current.focus();
        else if (newErrors.activityType && activityTypeRef.current) activityTypeRef.current.focus();
        else if (newErrors.workoutTiming && workoutTimingRef.current) workoutTimingRef.current.focus();
        else if (newErrors.athleticGoal && athleticGoalRef.current) athleticGoalRef.current.focus();
        else if (newErrors.currentTrainingPhase && currentTrainingPhaseRef.current) currentTrainingPhaseRef.current.focus();
    }
    return formIsValid;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    const userDataToSubmit: UserData = {
      gender,
      height: parseFloat(height),
      weight: parseFloat(weight),
      age: parseInt(age, 10),
      selectedPredefinedIllnesses: selectedPredefinedIllnesses,
      otherIllnessDetails: otherIllnessDetails,
      dietaryGoal,
      currentMood: currentMood || undefined, 
      currentCraving: currentCraving || undefined,
      // Preserve existing feedback history and palate profile if this is an update
      feedbackHistory: initialData?.feedbackHistory || [], 
      palateProfile: initialData?.palateProfile || { preferredAspects: [], dislikedAspects: [] },
      isAthlete: isAthlete,
    };

    if (isAthlete) {
        userDataToSubmit.activityType = activityType || undefined;
        userDataToSubmit.workoutTiming = workoutTiming || 'general'; // Default if somehow empty
        userDataToSubmit.athleticGoal = athleticGoal || undefined;
        userDataToSubmit.currentTrainingPhase = currentTrainingPhase || undefined;
        userDataToSubmit.trainingPhaseGoal = trainingPhaseGoal.trim() || undefined;
    }

    onSubmit(userDataToSubmit);
  };
  
  const FormField: React.FC<{label: string, id: string, children: React.ReactNode, error?: string, optional?: boolean}> = ({label, id, children, error, optional}) => (
    <div className="mb-5">
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="text-xs text-gray-500"> (اختیاری)</span>}
      </label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8 bg-white rounded-xl shadow-2xl space-y-6 transform transition-all hover:scale-[1.01]">
      <h2 className="text-2xl font-semibold text-center text-emerald-700 mb-6">
        {initialData ? "ویرایش اطلاعات شما" : "اطلاعات خود را وارد کنید"}
      </h2>
      
      <FormField label="جنسیت" id="gender">
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        >
          {GENDER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="سن" id="age" error={errors.age}>
        <select
          id="age"
          ref={ageRef}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          aria-describedby={errors.age ? "age-error" : undefined}
        >
          {AGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>
      
      <FormField label="قد" id="height" error={errors.height}>
        <select
          id="height"
          ref={heightRef}
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          aria-describedby={errors.height ? "height-error" : undefined}
        >
          {HEIGHT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="وزن" id="weight" error={errors.weight}>
        <select
          id="weight"
          ref={weightRef}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          aria-describedby={errors.weight ? "weight-error" : undefined}
        >
          {WEIGHT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>
      
      <FormField label="هدف شما از این رژیم/وعده غذایی چیست؟" id="dietaryGoal" error={errors.dietaryGoal}>
        <select
          id="dietaryGoal"
          ref={dietaryGoalRef}
          value={dietaryGoal}
          onChange={(e) => setDietaryGoal(e.target.value as DietaryGoal)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          aria-describedby={errors.dietaryGoal ? "dietaryGoal-error" : undefined}
        >
          {DIETARY_GOAL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FormField>

      {/* Mood and Craving Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-emerald-600 mb-4 text-center">همراهی با حال و هوس شما</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <FormField label="در حال حاضر چه حسی دارید؟" id="currentMood" optional>
                <select
                id="currentMood"
                value={currentMood}
                onChange={(e) => setCurrentMood(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                {MOOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                </select>
            </FormField>
            <FormField label="به چه نوع طعم یا بافتی هوس کرده‌اید?" id="currentCraving" optional>
                <select
                id="currentCraving"
                value={currentCraving}
                onChange={(e) => setCurrentCraving(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                {CRAVING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                </select>
            </FormField>
        </div>
      </div>
      
      {/* Illness Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 space-y-4 p-4 bg-gray-50 rounded-lg">
        <fieldset>
          <legend className="block mb-2 text-sm font-medium text-gray-700">
            بیماری خاص یا وضعیت ویژه (در صورت وجود، موارد مربوطه را انتخاب کنید)
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
            {PREDEFINED_ILLNESS_OPTIONS.map(illness => (
              <label key={illness} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPredefinedIllnesses.includes(illness)}
                  onChange={() => handlePredefinedIllnessChange(illness)}
                  className="form-checkbox h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-gray-700 text-sm">{illness}</span>
              </label>
            ))}
          </div>
        </fieldset>
        
        <FormField label="سایر توضیحات یا بیماری‌های دیگر" id="otherIllnessDetails" optional>
          <textarea
            id="otherIllnessDetails"
            value={otherIllnessDetails}
            onChange={(e) => setOtherIllnessDetails(e.target.value)}
            placeholder="مثال: آلرژی به بادام زمینی"
            rows={2}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          ></textarea>
        </FormField>
      </div>

      {/* Athlete Mode Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 space-y-4 p-4 bg-emerald-50 rounded-lg">
        <h3 className="text-lg font-medium text-emerald-600 mb-4 text-center">تغذیه ورزشی (اختیاری)</h3>
        <FormField label="آیا به طور منظم ورزش می‌کنید و به دنبال تغذیه ورزشی هستید؟" id="isAthlete">
          <select
            id="isAthlete"
            value={isAthlete ? "yes" : "no"}
            onChange={(e) => {
                const newIsAthlete = e.target.value === "yes";
                setIsAthlete(newIsAthlete);
                if (!newIsAthlete) { // Reset athlete specific fields if user is not an athlete
                    setActivityType('');
                    setWorkoutTiming('general');
                    setAthleticGoal('');
                    setCurrentTrainingPhase('');
                    setTrainingPhaseGoal('');
                }
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          >
            {ATHLETE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>

        {isAthlete && (
          <>
            <FormField label="نوع فعالیت ورزشی اصلی شما چیست؟" id="activityType" error={errors.activityType}>
              <select
                id="activityType"
                ref={activityTypeRef}
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                aria-describedby={errors.activityType ? "activityType-error" : undefined}
              >
                {ACTIVITY_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ""}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="این وعده غذایی چه زمانی نسبت به تمرین شما مصرف می‌شود؟ (برای پیشنهاد تک‌وعده‌ای)" id="workoutTiming" error={errors.workoutTiming}>
              <select
                id="workoutTiming"
                ref={workoutTimingRef}
                value={workoutTiming}
                onChange={(e) => setWorkoutTiming(e.target.value as UserData['workoutTiming'])}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                aria-describedby={errors.workoutTiming ? "workoutTiming-error" : undefined}
              >
                {WORKOUT_TIMING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="هدف اصلی ورزشی شما چیست؟" id="athleticGoal" error={errors.athleticGoal}>
              <select
                id="athleticGoal"
                ref={athleticGoalRef}
                value={athleticGoal}
                onChange={(e) => setAthleticGoal(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                aria-describedby={errors.athleticGoal ? "athleticGoal-error" : undefined}
              >
                {ATHLETIC_GOAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ""}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <h4 className="text-md font-medium text-emerald-600 pt-3 border-t border-emerald-200">تمرکز بر چرخه تمرینی (اختیاری پیشرفته)</h4>
             <FormField label="فاز تمرینی فعلی شما چیست؟" id="currentTrainingPhase" error={errors.currentTrainingPhase}>
              <select
                id="currentTrainingPhase"
                ref={currentTrainingPhaseRef}
                value={currentTrainingPhase}
                onChange={(e) => setCurrentTrainingPhase(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                aria-describedby={errors.currentTrainingPhase ? "currentTrainingPhase-error" : undefined}
              >
                {TRAINING_PHASE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ""}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="هدف دقیق شما از این فاز تمرینی چیست؟" id="trainingPhaseGoal" optional>
              <input
                type="text"
                id="trainingPhaseGoal"
                value={trainingPhaseGoal}
                onChange={(e) => setTrainingPhaseGoal(e.target.value)}
                placeholder="مثال: افزایش رکورد پرس سینه به ۱۰۰ کیلوگرم"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </FormField>
          </>
        )}
      </div>
      
      {Object.values(errors).filter(Boolean).length > 0 && (
         <div className="text-xs text-red-600 text-center py-2">لطفا خطاهای مشخص شده در فرم را برطرف کنید.</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 space-x-reverse"
        aria-live="polite"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>در حال پردازش...</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{initialData ? "ذخیره تغییرات و دریافت پیشنهاد" : "دریافت پیشنهاد وعده غذایی"}</span>
          </>
        )}
      </button>
    </form>
  );
};

export default UserInputForm;