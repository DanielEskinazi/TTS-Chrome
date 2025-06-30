import React from 'react';
import { HelpCircle, ExternalLink, Book, MessageCircle } from 'lucide-react';

export const HelpTab: React.FC = () => {
  const handleOpenLink = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <HelpCircle className="h-4 w-4" />
          <span>How to Use</span>
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="steps steps-vertical">
            <div className="step step-primary">
              <div className="text-left">
                <strong>Select Text</strong>
                <p className="text-gray-600 mt-1">Highlight any text on a webpage</p>
              </div>
            </div>
            <div className="step step-primary">
              <div className="text-left">
                <strong>Right-click</strong>
                <p className="text-gray-600 mt-1">Choose "Read This" from the context menu</p>
              </div>
            </div>
            <div className="step">
              <div className="text-left">
                <strong>Listen</strong>
                <p className="text-gray-600 mt-1">The text will be read aloud using TTS</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3">Quick Tips</h3>
        
        <div className="space-y-2 text-sm">
          <div className="alert alert-info">
            <HelpCircle className="h-4 w-4" />
            <span>Use keyboard shortcuts for faster control</span>
          </div>
          
          <div className="alert alert-info">
            <HelpCircle className="h-4 w-4" />
            <span>Adjust speed and volume in the Main tab</span>
          </div>
          
          <div className="alert alert-info">
            <HelpCircle className="h-4 w-4" />
            <span>Try different voices in Settings</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3">Support & Resources</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => handleOpenLink('https://github.com/DanielEskinazi/TTS-Chrome#readme')}
            className="btn btn-outline btn-sm w-full flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Book className="h-4 w-4" />
              <span>Documentation</span>
            </div>
            <ExternalLink className="h-3 w-3" />
          </button>
          
          <button 
            onClick={() => handleOpenLink('https://github.com/DanielEskinazi/TTS-Chrome/issues')}
            className="btn btn-outline btn-sm w-full flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Report Issue</span>
            </div>
            <ExternalLink className="h-3 w-3" />
          </button>
          
          <button 
            onClick={() => handleOpenLink('https://github.com/DanielEskinazi/TTS-Chrome')}
            className="btn btn-outline btn-sm w-full flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4" />
              <span>Source Code</span>
            </div>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-3">About</h3>
        
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>License:</strong> MIT</p>
          <p><strong>Developer:</strong> Daniel Eskinazi</p>
          <p className="pt-2">
            A modern Chrome extension for text-to-speech functionality with advanced features 
            including multiple voices, playback controls, and comprehensive text processing.
          </p>
        </div>
      </div>
    </div>
  );
};