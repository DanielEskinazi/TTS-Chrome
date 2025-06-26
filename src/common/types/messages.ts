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
  
  // Content script
  CONTENT_READY = 'CONTENT_READY',
  HIGHLIGHT_TEXT = 'HIGHLIGHT_TEXT',
  
  // Text selection
  SELECTION_CHANGED = 'SELECTION_CHANGED',
  SELECTION_CLEARED = 'SELECTION_CLEARED',
  GET_SELECTION = 'GET_SELECTION',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
  SELECTION_ERROR = 'SELECTION_ERROR',
}

export interface Message {
  type: MessageType;
  payload?: Record<string, unknown>;
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