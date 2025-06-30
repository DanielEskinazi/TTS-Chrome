import React, { createContext, useContext, useState, useCallback } from 'react';
import { PopupState, PopupContextType } from '../types/popup.types';

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within PopupProvider');
  }
  return context;
};

interface PopupProviderProps {
  children: React.ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const [state, setState] = useState<PopupState>({
    isLoading: false,
    error: null,
    activeTab: 'main',
    ttsStatus: 'idle'
  });

  const sendMessage = useCallback(async (message: Record<string, unknown>) => {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to communicate with extension'
      }));
      throw error;
    }
  }, []);

  const value: PopupContextType = {
    state,
    setState,
    sendMessage
  };

  return (
    <PopupContext.Provider value={value}>
      {children}
    </PopupContext.Provider>
  );
};