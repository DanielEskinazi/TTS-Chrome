import React from 'react';
import { ExternalLink, Github } from 'lucide-react';

export const PopupFooter: React.FC = () => {
  const handleOpenGithub = () => {
    chrome.tabs.create({ 
      url: 'https://github.com/DanielEskinazi/TTS-Chrome' 
    });
  };

  const handleOpenHelp = () => {
    chrome.tabs.create({ 
      url: 'https://github.com/DanielEskinazi/TTS-Chrome#readme' 
    });
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <button
            onClick={handleOpenGithub}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <Github className="h-3 w-3" />
            <span>GitHub</span>
          </button>
          
          <button
            onClick={handleOpenHelp}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Help</span>
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          © 2024 TTS Extension
        </div>
      </div>
    </footer>
  );
};