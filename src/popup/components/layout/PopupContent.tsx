import React from 'react';
import { usePopup } from '../../contexts/PopupContext';
import { MainTab } from '../tabs/MainTab';
import { SettingsTab } from '../tabs/SettingsTab';
import { HelpTab } from '../tabs/HelpTab';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export const PopupContent: React.FC = () => {
  const { state } = usePopup();

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (state.activeTab) {
      case 'main':
        return <MainTab />;
      case 'settings':
        return <SettingsTab />;
      case 'help':
        return <HelpTab />;
      default:
        return <MainTab />;
    }
  };

  return (
    <ErrorBoundary>
      <main className="flex-1 overflow-y-auto p-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800">{state.error}</p>
          </div>
        )}
        {renderActiveTab()}
      </main>
    </ErrorBoundary>
  );
};