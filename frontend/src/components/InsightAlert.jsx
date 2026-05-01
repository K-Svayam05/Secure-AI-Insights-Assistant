import React from 'react';

const InsightAlert = ({ message, type = 'info' }) => {
  const colors = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    success: 'bg-green-50 text-green-800 border-green-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[type]}`}>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

export default InsightAlert;
