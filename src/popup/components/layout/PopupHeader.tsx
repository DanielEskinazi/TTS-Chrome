import React from 'react';
import { Volume2, Settings, HelpCircle } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';

export const PopupHeader: React.FC = () => {
  const { state, setState } = usePopup();

  const handleTabChange = (tab: 'main' | 'settings' | 'help') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">
            Text to Speech
          </h1>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className={`
            w-2 h-2 rounded-full 
            ${state.ttsStatus === 'speaking' ? 'bg-green-500' : 
              state.ttsStatus === 'paused' ? 'bg-yellow-500' : 
              state.ttsStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}
          `} />
          <span className="text-xs text-gray-500 ml-1">
            v1.0.0
          </span>
        </div>
      </div>
      
      <nav className="flex space-x-1 mt-3">
        {[
          { id: 'main', label: 'Main', icon: Volume2 },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'help', label: 'Help', icon: HelpCircle }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id as any)}
            className={`
              flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium
              transition-colors duration-200
              ${state.activeTab === id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};