import React from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { usePopup } from '../../contexts/PopupContext';

export const MainTab: React.FC = () => {
  const { state } = usePopup();

  return (
    <div className="space-y-4">
      {/* TTS Status Card */}
      <div className={`
        bg-white p-4 rounded-lg border-2 transition-all duration-300
        ${state.ttsStatus === 'speaking' ? 'bg-green-50 border-green-200' : 
          state.ttsStatus === 'paused' ? 'bg-yellow-50 border-yellow-200' : 
          state.ttsStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
      `}>
        <div className="text-center">
          <h3 className="font-semibold mb-2">
            {state.ttsStatus === 'speaking' ? 'Currently Reading' :
             state.ttsStatus === 'paused' ? 'Paused' :
             state.ttsStatus === 'error' ? 'Error' : 'Ready'}
          </h3>
          <p className="text-sm text-gray-600">
            {state.ttsStatus === 'idle' ? 'Select text on any webpage to start' :
             'Lorem ipsum dolor sit amet, consectetur...'}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-2">
        <button className="btn btn-primary flex-1 flex items-center justify-center space-x-2">
          <Play className="h-4 w-4" />
          <span>Play</span>
        </button>
        <button className="btn btn-secondary flex-1 flex items-center justify-center space-x-2">
          <Pause className="h-4 w-4" />
          <span>Pause</span>
        </button>
        <button className="btn btn-outline flex-1 flex items-center justify-center space-x-2">
          <Square className="h-4 w-4" />
          <span>Stop</span>
        </button>
      </div>

      {/* Quick Settings */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <Volume2 className="h-4 w-4" />
          <span>Quick Settings</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Voice</label>
            <select className="select select-bordered select-sm">
              <option>Default Voice</option>
              <option>Male Voice</option>
              <option>Female Voice</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Speed</label>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              defaultValue="1" 
              className="range range-primary range-sm" 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Volume</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              defaultValue="0.8" 
              className="range range-primary range-sm" 
            />
          </div>
        </div>
      </div>

      {/* Test Area */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3">Test Voice</h3>
        <textarea 
          className="textarea textarea-bordered w-full h-20 text-sm"
          placeholder="Type some text here to test the voice..."
          defaultValue="Hello! This is a test of the text-to-speech functionality."
        />
        <button className="btn btn-primary btn-sm mt-2">
          Test Voice
        </button>
      </div>
    </div>
  );
};