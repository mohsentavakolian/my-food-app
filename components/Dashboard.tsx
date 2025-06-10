
import React, { useEffect, useRef } from 'react';
import { UserData, MealFeedback } from '../types';
import { Chart, registerables } from 'chart.js'; // Import Chart.js V3 style
Chart.register(...registerables); // Register all controllers, elements, scales, and plugins
import { TRAINING_PHASE_OPTIONS } from '../constants';

interface DashboardProps {
  userData: UserData | null;
  weeklyTasteReport: string | null;
  onClose: () => void;
  phaseSpecificInsights: string | null;
  isPhaseInsightsLoading: boolean;
  phaseInsightsError: string | null;
}

const getSimpleLabel = (value: string | undefined, options: {value: string, label: string}[]): string => {
    if (!value) return "";
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
};

const formatInsightsText = (text: string | null): React.ReactNode => {
    if (!text) return null;
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

const Dashboard: React.FC<DashboardProps> = ({ userData, weeklyTasteReport, onClose, phaseSpecificInsights, isPhaseInsightsLoading, phaseInsightsError }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null); // To store the chart instance

  useEffect(() => {
    if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy(); 
    }
    if (chartRef.current && userData && userData.feedbackHistory && userData.feedbackHistory.length > 0) {
      const likedAspectsCounts: { [key: string]: number } = {};
      userData.feedbackHistory.forEach(feedback => {
        if (feedback.likedAspects) {
          feedback.likedAspects.forEach(aspect => {
            likedAspectsCounts[aspect] = (likedAspectsCounts[aspect] || 0) + 1;
          });
        }
      });

      const labels = Object.keys(likedAspectsCounts);
      const data = Object.values(likedAspectsCounts);

      if (labels.length > 0) {
        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
          chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [{
                label: 'تعداد دفعات پسندیدن',
                data: data,
                backgroundColor: 'rgba(16, 185, 129, 0.6)', 
                borderColor: 'rgba(5, 150, 105, 1)', 
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y', 
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: { stepSize: 1, color: '#4b5563' },
                  grid: { color: '#e5e7eb' }
                },
                y: {
                   ticks: { color: '#4b5563' },
                   grid: { display: false }
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#10b981' }
              }
            }
          });
        }
      }
    }
    return () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }
    };
  }, [userData]); 

  if (!userData) {
    return (
      <div className="mt-8 p-6 bg-white rounded-xl shadow-2xl animate-fadeIn text-center">
        <p className="text-gray-600">اطلاعاتی برای نمایش در داشبورد وجود ندارد.</p>
        <button
            onClick={onClose}
            className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
        >
            بستن داشبورد
        </button>
      </div>
    );
  }
  
  const { palateProfile, feedbackHistory, isAthlete, currentTrainingPhase, trainingPhaseGoal } = userData;

  return (
    <div className="mt-8 p-4 md:p-6 bg-white rounded-xl shadow-2xl animate-fadeIn w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-emerald-700">داشبورد سلامت و پیشرفت من</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="بستن داشبورد"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Athlete Training Phase Insights Section */}
      {isAthlete && currentTrainingPhase && (
        <div className="mb-8 p-4 bg-sky-50 border border-sky-200 rounded-lg">
          <h3 className="text-lg font-semibold text-sky-700 mb-2">راهنمای تغذیه تخصصی برای فاز شما</h3>
          <p className="text-sm text-gray-700 mb-1">
            <strong>فاز تمرینی فعلی:</strong> {getSimpleLabel(currentTrainingPhase, TRAINING_PHASE_OPTIONS)}
          </p>
          {trainingPhaseGoal && (
            <p className="text-sm text-gray-700 mb-3">
              <strong>هدف شما از این فاز:</strong> {trainingPhaseGoal}
            </p>
          )}
          {isPhaseInsightsLoading && <p className="text-sm text-sky-600">در حال بارگذاری راهنمایی...</p>}
          {phaseInsightsError && <p className="text-sm text-red-600">خطا در بارگذاری راهنمایی: {phaseInsightsError}</p>}
          {phaseSpecificInsights && !isPhaseInsightsLoading && !phaseInsightsError && (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {formatInsightsText(phaseSpecificInsights)}
            </div>
          )}
        </div>
      )}

      {/* Palate Profile Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-emerald-600 mb-3">پروفایل ذائقه شما</h3>
        {palateProfile && (palateProfile.preferredAspects.length > 0 || palateProfile.dislikedAspects.length > 0) ? (
          <div className="space-y-2 text-sm">
            {palateProfile.preferredAspects.length > 0 && (
              <div>
                <strong className="text-green-600">موارد مورد علاقه:</strong>
                <span className="text-gray-700 ml-1 rtl:mr-1">{palateProfile.preferredAspects.join('، ')}</span>
              </div>
            )}
            {palateProfile.dislikedAspects.length > 0 && (
              <div>
                <strong className="text-red-600">موارد کمتر مورد علاقه:</strong>
                <span className="text-gray-700 ml-1 rtl:mr-1">{palateProfile.dislikedAspects.join('، ')}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">هنوز پروفایل ذائقه شما شکل نگرفته است. با ارائه بازخورد، به ما کمک کنید سلیقه شما را بهتر بشناسیم!</p>
        )}
      </div>

      {/* Weekly Taste Report Section */}
      {weeklyTasteReport && (
        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <h3 className="text-lg font-semibold text-emerald-600 mb-2">گزارش ذائقه</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{weeklyTasteReport}</p>
        </div>
      )}
      
      {/* Liked Aspects Chart Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-emerald-600 mb-3">نمودار جنبه‌های دوست‌داشته شده در بازخوردها</h3>
        {feedbackHistory && feedbackHistory.some(fb => fb.likedAspects && fb.likedAspects.length > 0) ? (
          <div className="relative h-64 md:h-80 w-full bg-gray-50 p-3 rounded-lg">
            <canvas ref={chartRef}></canvas>
          </div>
        ) : (
          <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">هنوز بازخوردی همراه با جنبه‌های دوست‌داشته شده ثبت نکرده‌اید تا نمودار آن نمایش داده شود.</p>
        )}
      </div>

       <button
            onClick={onClose}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
        >
            بستن داشبورد
        </button>
    </div>
  );
};

export default Dashboard;