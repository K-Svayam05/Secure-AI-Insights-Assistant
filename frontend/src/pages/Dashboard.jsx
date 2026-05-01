import React from 'react';
import KPICard from '../components/KPICard';
import ChartBlock from '../components/ChartBlock';
import InsightAlert from '../components/InsightAlert';
import ChatPage from './ChatPage';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Futures First Dashboard</h1>
        
        <InsightAlert message="Welcome to the AI Assistant. Your knowledge base is ready." type="info" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard title="Total Documents" value="11" />
          <KPICard title="Insights Generated" value="1,204" />
          <KPICard title="Active Queries" value="42" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartBlock title="Trend Analysis" />
          </div>
          <div className="lg:col-span-1 h-96">
            <ChatPage />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
