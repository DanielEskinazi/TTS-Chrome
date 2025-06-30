import React from 'react';
import { Settings, Save } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Voice Preferences</span>
        </h3>
        
        <div className="space-y-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Preferred Voice</span>
            </label>
            <select className="select select-bordered">
              <option>System Default</option>
              <option>Google UK English Female</option>
              <option>Google UK English Male</option>
              <option>Google US English Female</option>
              <option>Google US English Male</option>
            </select>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Default Speed</span>
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.1" 
              defaultValue="1" 
              className="range range-primary" 
            />
            <div className="w-full flex justify-between text-xs px-2">
              <span>0.1x</span>
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Default Volume</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              defaultValue="0.8" 
              className="range range-primary" 
            />
            <div className="w-full flex justify-between text-xs px-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3">Behavior Settings</h3>
        
        <div className="space-y-3">
          <div className="form-control">
            <label className="cursor-pointer label">
              <span className="label-text">Auto-start when text is selected</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </label>
          </div>
          
          <div className="form-control">
            <label className="cursor-pointer label">
              <span className="label-text">Show reading progress</span>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </label>
          </div>
          
          <div className="form-control">
            <label className="cursor-pointer label">
              <span className="label-text">Highlight current sentence</span>
              <input type="checkbox" className="toggle toggle-primary" />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Play/Pause</span>
            <kbd className="kbd kbd-sm">Ctrl + Shift + P</kbd>
          </div>
          <div className="flex justify-between">
            <span>Stop</span>
            <kbd className="kbd kbd-sm">Ctrl + Shift + S</kbd>
          </div>
          <div className="flex justify-between">
            <span>Speed Up</span>
            <kbd className="kbd kbd-sm">Ctrl + Shift + +</kbd>
          </div>
          <div className="flex justify-between">
            <span>Speed Down</span>
            <kbd className="kbd kbd-sm">Ctrl + Shift + -</kbd>
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full flex items-center justify-center space-x-2">
        <Save className="h-4 w-4" />
        <span>Save Settings</span>
      </button>
    </div>
  );
};