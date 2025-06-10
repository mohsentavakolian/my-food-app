import React, { useRef, useState } from 'react';
import { MealTimeName } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf'; // Default import
import type { jsPDF as JsPDFType } from 'jspdf'; // Type import

interface MealSuggestionCardProps {
  suggestion: string;
  mealTime: MealTimeName;
  bmi: number | null;
  bmr: number | null;
  idealWeightRange: { lower: number; upper: number } | null;
  overweightAmountKg: number | null;
}

const parseMacros = (text: string): { protein?: string; carbs?: string; fat?: string } | null => {
    const macroRegex = /\*\*ماکرومغذی‌ها:\*\*\s*پروتئین:\s*([^،]+گرم)،\s*کربوهیدرات:\s*([^،]+گرم)،\s*چربی:\s*([^،]+گرم)/i;
    const match = text.match(macroRegex);
    if (match) {
        return {
            protein: match[1]?.trim(),
            carbs: match[2]?.trim(),
            fat: match[3]?.trim(),
        };
    }
    const proteinMatch = text.match(/پروتئین:\s*([^،\n]+گرم)/i);
    const carbsMatch = text.match(/کربوهیدرات:\s*([^،\n]+گرم)/i);
    const fatMatch = text.match(/چربی:\s*([^،\n]+گرم)/i);

    if (proteinMatch || carbsMatch || fatMatch) {
        return {
            protein: proteinMatch ? proteinMatch[1].trim() : undefined,
            carbs: carbsMatch ? carbsMatch[1].trim() : undefined,
            fat: fatMatch ? fatMatch[1].trim() : undefined,
        };
    }
    return null;
};


const MealSuggestionCard: React.FC<MealSuggestionCardProps> = ({ suggestion, mealTime, bmi, bmr, idealWeightRange, overweightAmountKg }) => {
  const macros = parseMacros(suggestion);
  const cleanSuggestion = suggestion.replace(/\*\*ماکرومغذی‌ها:\*\*\s*پروتئین:.*?\n?/i, "").trim();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const formatSuggestion = (text: string): React.ReactNode => {
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

  const getBMICategory = (bmiValue: number | null): string => {
    if (bmiValue === null) return "";
    if (bmiValue < 18.5) return "کمبود وزن";
    if (bmiValue < 24.9) return "وزن نرمال";
    if (bmiValue < 29.9) return "اضافه وزن";
    if (bmiValue < 34.9) return "چاقی درجه ۱";
    if (bmiValue < 39.9) return "چاقی درجه ۲";
    return "چاقی درجه ۳ (مفرط)";
  };

  const getBMICategoryColor = (bmiValue: number | null): string => {
    if (bmiValue === null) return "text-gray-700";
    if (bmiValue < 18.5) return "text-blue-600"; 
    if (bmiValue < 24.9) return "text-green-600"; 
    if (bmiValue < 29.9) return "text-yellow-600"; 
    if (bmiValue < 34.9) return "text-orange-600"; 
    if (bmiValue < 39.9) return "text-red-600"; 
    return "text-red-700 font-bold"; 
  }

  const handleExportImage = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Increased scale for better quality
        backgroundColor: '#ffffff', 
        onclone: (document) => {
          const exportButtons = document.getElementById('meal-suggestion-export-buttons-container');
          if (exportButtons) exportButtons.style.display = 'none';
        }
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `پیشنهاد-${mealTime}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting image:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Increased scale for better quality
        backgroundColor: '#ffffff',
        onclone: (document) => {
          const exportButtons = document.getElementById('meal-suggestion-export-buttons-container');
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
      pdf.save(`پیشنهاد-${mealTime}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={cardRef} className="mt-8 p-6 md:p-8 bg-white rounded-xl shadow-2xl animate-fadeIn">
      <div className="flex items-center mb-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 mr-3 rtl:ml-3 rtl:mr-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.993.883L4 8v9a1 1 0 001 1h10a1 1 0 001-1V8l-.007-.117A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5H8V6a2 2 0 114 0v1z" />
        </svg>
        <h2 className="text-2xl font-semibold text-emerald-700">
          پیشنهاد <span className="text-emerald-500">{mealTime}</span> برای شما:
        </h2>
      </div>

      {(bmi || bmr || idealWeightRange) && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-gray-700 space-y-2">
          {bmi !== null && (
            <p>
              <strong className="font-semibold text-emerald-700">شاخص توده بدنی (BMI): </strong> 
              <span className={`font-bold ${getBMICategoryColor(bmi)}`}>{bmi.toFixed(1)}</span>
              <span className={`ml-2 rtl:mr-2 rtl:ml-0 ${getBMICategoryColor(bmi)}`}>({getBMICategory(bmi)})</span>
            </p>
          )}
          {bmr !== null && (
            <p>
              <strong className="font-semibold text-emerald-700">میزان متابولیسم پایه (BMR): </strong> 
              <span className="font-bold text-emerald-600">{bmr.toFixed(0)}</span> کالری در روز (نیاز پایه بدن شما در حالت استراحت)
            </p>
          )}
          {idealWeightRange !== null && (
            <p>
              <strong className="font-semibold text-emerald-700">محدوده وزن ایده‌آل برای قد شما: </strong>
              <span className="font-semibold text-green-600">{idealWeightRange.lower}</span> کیلوگرم تا <span className="font-semibold text-green-600">{idealWeightRange.upper}</span> کیلوگرم.
            </p>
          )}
          {overweightAmountKg !== null && overweightAmountKg > 0 && (
            <p className="text-yellow-700 bg-yellow-50 p-2 rounded-md">
              <strong className="font-semibold">توجه: </strong>
              شما حدود <span className="font-bold">{overweightAmountKg}</span> کیلوگرم بالاتر از محدوده وزن ایده‌آل خود قرار دارید.
            </p>
          )}
        </div>
      )}

      {macros && (macros.protein || macros.carbs || macros.fat) && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm">
          <h4 className="text-md font-semibold text-teal-700 mb-1">اطلاعات ماکرومغذی‌ها (تقریبی):</h4>
          <ul className="list-disc list-inside ml-4 rtl:mr-4 rtl:ml-0 text-teal-600 space-y-0.5">
            {macros.protein && <li><strong>پروتئین:</strong> {macros.protein}</li>}
            {macros.carbs && <li><strong>کربوهیدرات:</strong> {macros.carbs}</li>}
            {macros.fat && <li><strong>چربی:</strong> {macros.fat}</li>}
          </ul>
        </div>
      )}
      
      <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
        {formatSuggestion(cleanSuggestion)}
      </div>

      <div id="meal-suggestion-export-buttons-container" className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end gap-3">
        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className="flex items-center justify-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rtl:ml-2 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          )}
          <span>خروجی تصویر (PNG)</span>
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center justify-center px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rtl:ml-2 rtl:-mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          )}
          <span>خروجی PDF</span>
        </button>
      </div>
    </div>
  );
};

export default MealSuggestionCard;