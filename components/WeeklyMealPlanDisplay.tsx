import React, { useState, useRef } from 'react';
import { WeeklyPlanResponse, DailyPlan, PlannedMeal, MealTimeName } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { jsPDF as JsPDFType } from 'jspdf';

interface PlannedMealCardProps {
  meal: PlannedMeal;
}

const PlannedMealCard: React.FC<PlannedMealCardProps> = ({ meal }) => {
  return (
    <div className="bg-emerald-50 p-4 rounded-lg shadow mb-3 transform transition-all hover:shadow-md hover:scale-[1.02]">
      <h4 className="text-md font-semibold text-emerald-700 mb-1">{meal.mealName} <span className="text-xs text-emerald-500">({meal.mealType})</span></h4>
      {meal.description && <p className="text-xs text-gray-600 mb-1">{meal.description}</p>}
      {meal.calories && <p className="text-xs text-gray-500"><strong>کالری:</strong> {meal.calories}</p>}
      
      {meal.macros && (meal.macros.protein || meal.macros.carbs || meal.macros.fat) && (
        <div className="mt-1.5 text-xs text-gray-500">
          <span className="font-medium">ماکروها: </span>
          {meal.macros.protein && <span>پ: {meal.macros.protein}</span>}
          {meal.macros.carbs && <span className="mx-1 rtl:mx-0 rtl:mr-1 rtl:ml-1">ک: {meal.macros.carbs}</span>}
          {meal.macros.fat && <span>چ: {meal.macros.fat}</span>}
        </div>
      )}

      {meal.preparationTime && <p className="text-xs text-gray-500 mt-1"><strong>زمان آماده‌سازی:</strong> {meal.preparationTime}</p>}
      {meal.ingredients && meal.ingredients.length > 0 && (
        <div className="mt-1">
          <p className="text-xs text-gray-500 font-medium">مواد اصلی:</p>
          <ul className="list-disc list-inside ml-2 rtl:mr-2 rtl:ml-0 text-xs text-gray-500">
            {meal.ingredients.map((ing, idx) => <li key={idx}>{ing}</li>)}
          </ul>
        </div>
      )}
      {meal.notes && <p className="text-xs text-emerald-600 mt-1"><em>{meal.notes}</em></p>}
    </div>
  );
};

interface DailyPlanViewProps {
  dailyPlan: DailyPlan;
}

const DailyPlanView: React.FC<DailyPlanViewProps> = ({ dailyPlan }) => {
  return (
    <div className="space-y-3">
      {dailyPlan.phaseNote && (
        <p className="text-xs text-sky-700 bg-sky-50 p-2 rounded-md mb-3 italic">
          <span className="font-semibold">نکته فاز تمرینی:</span> {dailyPlan.phaseNote}
        </p>
      )}
      {dailyPlan.meals.filter(meal => meal.mealType === MealTimeName.BREAKFAST).map((meal, idx) => <PlannedMealCard key={`breakfast-${idx}`} meal={meal} />)}
      {dailyPlan.meals.filter(meal => meal.mealType === MealTimeName.LUNCH).map((meal, idx) => <PlannedMealCard key={`lunch-${idx}`} meal={meal} />)}
      {dailyPlan.meals.filter(meal => meal.mealType === MealTimeName.DINNER).map((meal, idx) => <PlannedMealCard key={`dinner-${idx}`} meal={meal} />)}
      {dailyPlan.meals.filter(meal => meal.mealType === MealTimeName.SNACK).map((meal, idx) => <PlannedMealCard key={`snack-${idx}`} meal={meal} />)}
      {dailyPlan.dailySummary && (
        <p className="text-sm text-gray-600 italic p-3 bg-gray-100 rounded-md">{dailyPlan.dailySummary}</p>
      )}
    </div>
  );
};


interface WeeklyMealPlanDisplayProps {
  plan: WeeklyPlanResponse;
}

const WeeklyMealPlanDisplay: React.FC<WeeklyMealPlanDisplayProps> = ({ plan }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const activeDayContentRef = useRef<HTMLDivElement>(null);

  if (!plan || !plan.dailyPlans || plan.dailyPlans.length === 0) {
    return <p className="text-center text-gray-600 my-6">برنامه غذایی برای نمایش وجود ندارد.</p>;
  }

  const currentDayPlan = plan.dailyPlans[activeTab];

  const handleExportImage = async () => {
    if (!activeDayContentRef.current || isExporting || !currentDayPlan) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(activeDayContentRef.current, {
        scale: 3, // Increased scale
        backgroundColor: '#ffffff',
        onclone: (document) => {
          const exportButtons = document.getElementById('weekly-plan-export-buttons-container');
          if (exportButtons) exportButtons.style.display = 'none';
        }
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const dayName = currentDayPlan.dayOfWeek.split(' ')[0] || 'برنامه-روزانه';
      link.download = `${dayName.replace(/[^\w\u0600-\u06FF-]/g, '_')}.png`; // Sanitize filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting weekly day image:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!activeDayContentRef.current || isExporting || !currentDayPlan) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(activeDayContentRef.current, {
        scale: 3, // Increased scale
        backgroundColor: '#ffffff',
        onclone: (document) => {
          const exportButtons = document.getElementById('weekly-plan-export-buttons-container');
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
      const dayName = currentDayPlan.dayOfWeek.split(' ')[0] || 'برنامه-روزانه';
      pdf.save(`${dayName.replace(/[^\w\u0600-\u06FF-]/g, '_')}.pdf`); // Sanitize filename
    } catch (error) {
      console.error("Error exporting weekly day PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="mt-8 p-4 md:p-6 bg-white rounded-xl shadow-2xl animate-fadeIn">
      <h2 className="text-2xl font-semibold text-emerald-700 mb-4 text-center">برنامه غذایی هفتگی شما</h2>
      {plan.weekSummary && (
        <p className="text-center text-gray-600 mb-6 italic p-3 bg-emerald-50 rounded-md">{plan.weekSummary}</p>
      )}

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-1" aria-label="Tabs">
          {plan.dailyPlans.map((dailyPlan, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm transition-colors
                ${activeTab === index
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {dailyPlan.dayOfWeek}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {plan.dailyPlans.map((dailyPlan, index) => (
          <div key={index} className={activeTab === index ? 'block animate-fadeIn' : 'hidden'}>
            <div ref={activeTab === index ? activeDayContentRef : null}> {/* Content to capture */}
                <h3 className="text-lg font-medium text-emerald-600 mb-3">{dailyPlan.dayOfWeek}</h3>
                <DailyPlanView dailyPlan={dailyPlan} />
            </div>
            {/* Export Buttons - Placed outside the captured ref's content, but related to the active tab */}
            {activeTab === index && (
              <div id="weekly-plan-export-buttons-container" className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="flex items-center justify-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rtl:ml-2 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  )}
                  <span>خروجی تصویر (PNG) این روز</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center justify-center px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rtl:ml-2 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  )}
                  <span>خروجی PDF این روز</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyMealPlanDisplay;