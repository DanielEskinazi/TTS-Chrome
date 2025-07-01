export enum MessageType {
  // State management
  GET_STATE = 'GET_STATE',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  
  // TTS operations
  SPEAK_TEXT = 'SPEAK_TEXT',
  SPEAK_SELECTION = 'SPEAK_SELECTION',
  STOP_SPEAKING = 'STOP_SPEAKING',
  TTS_FEEDBACK = 'TTS_FEEDBACK',
  
  // Enhanced TTS operations with Web Speech API
  START_TTS = 'START_TTS',
  STOP_TTS = 'STOP_TTS',
  FORCE_STOP_TTS = 'FORCE_STOP_TTS',
  PAUSE_TTS = 'PAUSE_TTS',
  RESUME_TTS = 'RESUME_TTS',
  TOGGLE_PAUSE_TTS = 'TOGGLE_PAUSE_TTS',
  TTS_STATE_CHANGED = 'TTS_STATE_CHANGED',
  TTS_ERROR = 'TTS_ERROR',
  GET_TTS_STATE = 'GET_TTS_STATE',
  
  // Content script speech synthesis
  START_SPEECH = 'START_SPEECH',
  STOP_SPEECH = 'STOP_SPEECH',
  FORCE_STOP = 'FORCE_STOP',
  PAUSE_SPEECH = 'PAUSE_SPEECH',
  RESUME_SPEECH = 'RESUME_SPEECH',
  TOGGLE_PAUSE_SPEECH = 'TOGGLE_PAUSE_SPEECH',
  
  // Content script
  CONTENT_READY = 'CONTENT_READY',
  HIGHLIGHT_TEXT = 'HIGHLIGHT_TEXT',
  
  // Text selection
  SELECTION_CHANGED = 'SELECTION_CHANGED',
  SELECTION_CLEARED = 'SELECTION_CLEARED',
  GET_SELECTION = 'GET_SELECTION',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
  SELECTION_ERROR = 'SELECTION_ERROR',
  
  // Voice management
  GET_VOICE_DATA = 'GET_VOICE_DATA',
  SELECT_VOICE = 'SELECT_VOICE',
  PREVIEW_VOICE = 'PREVIEW_VOICE',
  VOICE_CHANGED = 'VOICE_CHANGED',
  UPDATE_VOICE_DATA = 'UPDATE_VOICE_DATA',
  
  // Speed control
  GET_SPEED_INFO = 'GET_SPEED_INFO',
  SET_SPEED = 'SET_SPEED',
  INCREMENT_SPEED = 'INCREMENT_SPEED',
  DECREMENT_SPEED = 'DECREMENT_SPEED',
  SPEED_CHANGED = 'SPEED_CHANGED',
  CHANGE_SPEED = 'CHANGE_SPEED',
  GET_CURRENT_TEXT_LENGTH = 'GET_CURRENT_TEXT_LENGTH',
}

export interface Message {
  type: MessageType;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface MessageResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// Type guards
export function isMessage(obj: unknown): obj is Message {
  return obj !== null && typeof obj === 'object' && typeof (obj as Message).type === 'string' && (obj as Message).type in MessageType;
}

export function isMessageResponse(obj: unknown): obj is MessageResponse {
  return obj !== null && typeof obj === 'object' && typeof (obj as MessageResponse).success === 'boolean';
}