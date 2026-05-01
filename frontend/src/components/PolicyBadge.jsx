import React from 'react';

export default function PolicyBadge() {
  return (
    <div className="relative group flex items-center justify-center">
      <button className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2" title="Data Policy Guidelines">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </button>
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-64 p-4 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in transition-all">
        <h4 className="font-bold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5 flex items-center">
          <span className="mr-2">🛡️</span> Policy v3.25 Data Tiers
        </h4>
        <ul className="space-y-2 mt-2">
          <li className="flex items-start"><span className="font-bold text-green-500 w-6">T1</span> <span>Public Data (General stats)</span></li>
          <li className="flex items-start"><span className="font-bold text-blue-500 w-6">T2</span> <span>Internal (Corporate KPIs)</span></li>
          <li className="flex items-start"><span className="font-bold text-yellow-500 w-6">T3</span> <span>Confidential (Budgets)</span></li>
          <li className="flex items-start"><span className="font-bold text-red-500 w-6">T4</span> <span>Restricted (PII, user histories)</span></li>
        </ul>
        <p className="mt-3 text-red-400 font-semibold italic border-t border-gray-200 dark:border-gray-700 pt-2 text-center">AI generation blocked for T4 data.</p>
      </div>
    </div>
  );
}
