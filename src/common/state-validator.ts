/**
 * State validation utilities for TTS extension
 * Ensures consistent state management across components
 */

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText?: string;
}

/**
 * Validates TTS state for consistency
 * @param state The TTS state to validate
 * @returns true if state is valid, false otherwise
 */
export function validateTTSState(state: TTSState): boolean {
  // Invalid: isPaused=true but isPlaying=false
  if (state.isPaused && !state.isPlaying) {
    return false;
  }
  return true;
}

/**
 * Fixes invalid TTS state to ensure consistency
 * @param state The TTS state to fix
 * @returns A corrected TTS state
 */
export function fixInvalidState(state: TTSState): TTSState {
  if (state.isPaused && !state.isPlaying) {
    console.warn('[State-Validator] Fixed invalid state: isPaused=true, isPlaying=false');
    return { ...state, isPlaying: true };
  }
  return state;
}

/**
 * Debug utility to log state transitions
 * @param component Component name for logging
 * @param oldState Previous state
 * @param newState New state
 * @param context Additional context
 */
export function debugStateTransition(
  component: string,
  oldState: TTSState,
  newState: TTSState,
  context?: Record<string, unknown>
): void {
  // eslint-disable-next-line no-console
  console.log(`[${component}-State] State transition:`, {
    from: oldState,
    to: newState,
    valid: validateTTSState(newState),
    context
  });
}