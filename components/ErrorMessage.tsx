
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div 
      className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-6 rounded-md shadow-md" 
      role="alert"
    >
      <div className="flex items-center">
        <svg className="w-6 h-6 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
        <div>
            <p className="font-bold">خطا!</p>
            <p>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
    