import React, { useState, useEffect, useCallback, useRef } from 'react';

interface VolumeControlProps {
  onVolumeChange?: (volume: number) => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({ onVolumeChange }) => {
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [domainVolume, setDomainVolume] = useState<number | null>(null);
  const [presets, setPresets] = useState<Array<{id: string, name: string, volume: number}>>([]);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial volume state
    chrome.runtime.sendMessage({ type: 'GET_VOLUME_STATE' }, (response) => {
      if (response) {
        setVolume(response.volume);
        setIsMuted(response.isMuted);
        setDomainVolume(response.domainVolume);
        setPresets(response.presets || []);
      }
    });

    // Listen for volume changes
    const handleMessage = (message: any) => {
      if (message.type === 'VOLUME_CHANGED') {
        setVolume(message.volume);
        setIsMuted(message.isMuted);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    
    // Debounced save
    chrome.runtime.sendMessage({
      type: 'SET_VOLUME',
      volume: newVolume,
      options: { smooth: true, saveToDomain: false }
    });

    onVolumeChange?.(newVolume);
  }, [onVolumeChange]);

  const handleMuteToggle = useCallback(() => {
    const action = isMuted ? 'UNMUTE' : 'MUTE';
    chrome.runtime.sendMessage({ type: action });
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleSliderMouseDown = () => {
    setIsDragging(true);
    setShowTooltip(true);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
    setShowTooltip(false);
    
    // Save to domain if enabled
    if (domainVolume !== null) {
      chrome.runtime.sendMessage({
        type: 'SET_VOLUME',
        volume,
        options: { saveToDomain: true }
      });
    }
  };

  const handlePresetClick = useCallback((presetVolume: number) => {
    handleVolumeChange(presetVolume);
  }, [handleVolumeChange]);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 30) return '🔈';
    if (volume < 70) return '🔉';
    return '🔊';
  };

  const defaultPresets = [
    { id: 'quiet', name: 'Quiet', volume: 30 },
    { id: 'normal', name: 'Normal', volume: 70 },
    { id: 'loud', name: 'Loud', volume: 90 }
  ];

  return (
    <div className="volume-control p-4">
      <div className="flex items-center gap-3">
        {/* Mute Button */}
        <button
          className="btn btn-circle btn-sm"
          onClick={handleMuteToggle}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="text-lg">{getVolumeIcon()}</span>
        </button>

        {/* Volume Slider */}
        <div className="flex-1 relative">
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            onMouseDown={handleSliderMouseDown}
            onMouseUp={handleSliderMouseUp}
            onTouchStart={handleSliderMouseDown}
            onTouchEnd={handleSliderMouseUp}
            className="range range-primary range-sm"
            disabled={isMuted}
            aria-label="Volume"
          />
          
          {/* Volume Percentage Tooltip */}
          {showTooltip && (
            <div 
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                         bg-base-200 text-xs px-2 py-1 rounded shadow-lg z-10"
              style={{ left: `${volume}%` }}
            >
              {volume}%
            </div>
          )}
          
          {/* Volume Level Indicators */}
          <div className="flex justify-between text-xs mt-1 text-base-content/50">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Volume Percentage Display */}
        <div className="text-sm font-medium w-12 text-right">
          {isMuted ? '---' : `${volume}%`}
        </div>
      </div>

      {/* Domain-specific indicator */}
      {domainVolume !== null && (
        <div className="mt-2 text-xs text-base-content/70 flex items-center gap-1">
          <span className="badge badge-sm badge-primary">Domain</span>
          <span>Volume set for this site</span>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="mt-3 flex gap-2">
        {defaultPresets.map((preset) => (
          <button 
            key={preset.id}
            className="btn btn-xs"
            onClick={() => handlePresetClick(preset.volume)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Custom Presets */}
      {presets.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {presets.filter(p => p.id.startsWith('custom-')).map((preset) => (
            <button 
              key={preset.id}
              className="btn btn-xs btn-outline"
              onClick={() => handlePresetClick(preset.volume)}
            >
              {preset.name} ({preset.volume}%)
            </button>
          ))}
        </div>
      )}

      {/* Volume Actions */}
      <div className="mt-3 flex gap-2 text-xs">
        <button 
          className="link link-primary"
          onClick={() => {
            // Open domain volume settings
            chrome.runtime.sendMessage({
              type: 'SET_VOLUME',
              volume,
              options: { saveToDomain: true }
            });
            setDomainVolume(volume);
          }}
        >
          Save for this site
        </button>
        
        {domainVolume !== null && (
          <button 
            className="link link-secondary"
            onClick={() => {
              // Clear domain volume
              chrome.runtime.sendMessage({
                type: 'CLEAR_DOMAIN_VOLUME'
              });
              setDomainVolume(null);
            }}
          >
            Clear site volume
          </button>
        )}
      </div>
    </div>
  );
};