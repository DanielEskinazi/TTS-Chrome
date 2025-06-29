export interface PopupState {
  isLoading: boolean;
  error: string | null;
  activeTab: 'main' | 'settings' | 'help';
  ttsStatus: 'idle' | 'speaking' | 'paused' | 'error';
}

export interface PopupContextType {
  state: PopupState;
  setState: React.Dispatch<React.SetStateAction<PopupState>>;
  sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
}