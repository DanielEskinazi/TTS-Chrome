# Feature 3.2: Voice Selection

**Status: ✅ COMPLETED** | **Completed Date: 2025-06-30** | **Assignee: AI Assistant** | **Git Tag: feature-3.2-completed**

## Feature Overview and Objectives

### Primary Objective
Implement a comprehensive voice selection interface that allows users to browse, preview, and select from available text-to-speech voices. The interface should provide voice categorization, search functionality, and audio previews to help users find their preferred voice.

### Secondary Objectives
- Provide voice categorization by language, gender, and quality
- Implement voice search and filtering capabilities
- Enable voice preview functionality with sample text
- Support custom voice preferences and favorites
- Ensure accessibility for screen reader users
- Cache voice data for improved performance

### User Stories
- As a user, I want to browse all available voices categorized by language and type
- As a user, I want to search for voices by name, language, or characteristics
- As a user, I want to preview voices before selecting them
- As a user, I want to mark voices as favorites for quick access
- As a user, I want to see detailed information about each voice (language, gender, quality)
- As a user, I want the voice selection to persist across browser sessions

## Technical Requirements

### Functional Requirements
1. **Voice Discovery**: Enumerate all available system and web voices
2. **Voice Categorization**: Group voices by language, gender, and quality
3. **Search & Filter**: Real-time search with multiple filter criteria
4. **Voice Preview**: Play sample text with selected voice
5. **Favorites System**: Mark and organize favorite voices
6. **Persistence**: Remember selected voice and preferences
7. **Voice Information**: Display detailed voice metadata

### Non-Functional Requirements
1. **Performance**: Voice list loads within 200ms
2. **Accessibility**: Full keyboard navigation and screen reader support
3. **Internationalization**: Support for RTL languages and Unicode
4. **Offline Support**: Cache voice data for offline use
5. **Memory Efficiency**: Optimize voice preview audio handling
6. **Cross-platform**: Consistent behavior across operating systems

### Voice Data Structure
```typescript
interface Voice {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'neutral';
  quality: 'standard' | 'premium' | 'neural';
  localService: boolean;
  default: boolean;
  voiceURI: string;
}
```

## Implementation Steps

### Step 1: Voice Types and Interfaces

```typescript
// src/popup/types/voice.types.ts
export interface Voice {
  id: string;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'neutral';
  quality: 'standard' | 'premium' | 'neural';
  localService: boolean;
  default: boolean;
  voiceURI: string;
  isFavorite?: boolean;
}

export interface VoiceCategory {
  language: string;
  languageCode: string;
  voices: Voice[];
  flag: string; // Unicode flag emoji
}

export interface VoiceFilters {
  search: string;
  language: string;
  gender: string;
  quality: string;
  showFavoritesOnly: boolean;
}

export interface VoiceState {
  voices: Voice[];
  categories: VoiceCategory[];
  selectedVoice: Voice | null;
  favorites: string[]; // voice IDs
  filters: VoiceFilters;
  isLoading: boolean;
  isPlaying: boolean;
  previewText: string;
  error: string | null;
}
```

### Step 2: Voice Service

```typescript
// src/popup/services/voiceService.ts
import { Voice, VoiceCategory } from '../types/voice.types';

export class VoiceService {
  private static instance: VoiceService;
  private voices: Voice[] = [];
  private initialized = false;

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async initializeVoices(): Promise<Voice[]> {
    if (this.initialized) {
      return this.voices;
    }

    return new Promise((resolve) => {
      const loadVoices = () => {
        const speechSynthesisVoices = speechSynthesis.getVoices();
        
        this.voices = speechSynthesisVoices.map((voice, index) => ({
          id: `${voice.lang}-${voice.name}-${index}`,
          name: voice.name,
          lang: voice.lang,
          gender: this.detectGender(voice.name),
          quality: this.detectQuality(voice.name, voice.localService),
          localService: voice.localService,
          default: voice.default,
          voiceURI: voice.voiceURI
        }));

        this.initialized = true;
        resolve(this.voices);
      };

      // Voices might not be loaded immediately
      if (speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
        // Fallback timeout
        setTimeout(loadVoices, 1000);
      }
    });
  }

  private detectGender(voiceName: string): 'male' | 'female' | 'neutral' {
    const name = voiceName.toLowerCase();
    
    // Common patterns for gender detection
    const malePatterns = ['male', 'man', 'boy', 'masculine', 'deep'];
    const femalePatterns = ['female', 'woman', 'girl', 'feminine'];
    
    if (malePatterns.some(pattern => name.includes(pattern))) {
      return 'male';
    }
    if (femalePatterns.some(pattern => name.includes(pattern))) {
      return 'female';
    }
    
    // Additional heuristics based on common voice names
    const commonMaleNames = ['alex', 'daniel', 'diego', 'jorge', 'thomas'];
    const commonFemaleNames = ['alice', 'allison', 'anna', 'emma', 'samantha', 'susan', 'victoria'];
    
    if (commonMaleNames.some(name => voiceName.toLowerCase().includes(name))) {
      return 'male';
    }
    if (commonFemaleNames.some(name => voiceName.toLowerCase().includes(name))) {
      return 'female';
    }
    
    return 'neutral';
  }

  private detectQuality(voiceName: string, localService: boolean): 'standard' | 'premium' | 'neural' {
    const name = voiceName.toLowerCase();
    
    if (name.includes('neural') || name.includes('wavenet') || name.includes('studio')) {
      return 'neural';
    }
    if (name.includes('premium') || name.includes('enhanced') || !localService) {
      return 'premium';
    }
    return 'standard';
  }

  categorizeVoices(voices: Voice[]): VoiceCategory[] {
    const languageMap = new Map<string, Voice[]>();
    
    voices.forEach(voice => {
      const langCode = voice.lang.split('-')[0];
      if (!languageMap.has(langCode)) {
        languageMap.set(langCode, []);
      }
      languageMap.get(langCode)!.push(voice);
    });

    return Array.from(languageMap.entries()).map(([langCode, voiceList]) => ({
      language: this.getLanguageName(langCode),
      languageCode: langCode,
      voices: voiceList.sort((a, b) => a.name.localeCompare(b.name)),
      flag: this.getLanguageFlag(langCode)
    })).sort((a, b) => a.language.localeCompare(b.language));
  }

  private getLanguageName(langCode: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'th': 'Thai'
    };
    
    return languageNames[langCode] || langCode.toUpperCase();
  }

  private getLanguageFlag(langCode: string): string {
    const flags: Record<string, string> = {
      'en': '🇺🇸',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'zh': '🇨🇳',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
      'nl': '🇳🇱',
      'sv': '🇸🇪',
      'da': '🇩🇰',
      'no': '🇳🇴',
      'fi': '🇫🇮',
      'pl': '🇵🇱',
      'tr': '🇹🇷',
      'th': '🇹🇭'
    };
    
    return flags[langCode] || '🌐';
  }

  async previewVoice(voice: Voice, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any currently playing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const synth = speechSynthesis;
      
      // Find the actual voice object
      const speechVoice = synth.getVoices().find(v => 
        v.name === voice.name && v.lang === voice.lang
      );
      
      if (!speechVoice) {
        reject(new Error('Voice not found'));
        return;
      }
      
      utterance.voice = speechVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));
      
      synth.speak(utterance);
    });
  }

  stopPreview(): void {
    speechSynthesis.cancel();
  }
}
```

### Step 3: Voice Context

```typescript
// src/popup/contexts/VoiceContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Voice, VoiceState, VoiceFilters } from '../types/voice.types';
import { VoiceService } from '../services/voiceService';

type VoiceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VOICES'; payload: Voice[] }
  | { type: 'SET_SELECTED_VOICE'; payload: Voice | null }
  | { type: 'SET_FILTERS'; payload: Partial<VoiceFilters> }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PREVIEW_TEXT'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: VoiceState = {
  voices: [],
  categories: [],
  selectedVoice: null,
  favorites: [],
  filters: {
    search: '',
    language: '',
    gender: '',
    quality: '',
    showFavoritesOnly: false
  },
  isLoading: true,
  isPlaying: false,
  previewText: 'Hello! This is a sample of how this voice sounds.',
  error: null
};

function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_VOICES':
      const voiceService = VoiceService.getInstance();
      const categories = voiceService.categorizeVoices(action.payload);
      return { 
        ...state, 
        voices: action.payload,
        categories,
        isLoading: false
      };
    
    case 'SET_SELECTED_VOICE':
      return { ...state, selectedVoice: action.payload };
    
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      };
    
    case 'TOGGLE_FAVORITE':
      const favorites = state.favorites.includes(action.payload)
        ? state.favorites.filter(id => id !== action.payload)
        : [...state.favorites, action.payload];
      return { ...state, favorites };
    
    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload };
    
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    
    case 'SET_PREVIEW_TEXT':
      return { ...state, previewText: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    default:
      return state;
  }
}

interface VoiceContextType {
  state: VoiceState;
  dispatch: React.Dispatch<VoiceAction>;
  filteredVoices: Voice[];
  previewVoice: (voice: Voice) => Promise<void>;
  stopPreview: () => void;
  selectVoice: (voice: Voice) => void;
  toggleFavorite: (voiceId: string) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
};

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(voiceReducer, initialState);
  const voiceService = VoiceService.getInstance();

  // Initialize voices on mount
  useEffect(() => {
    const initVoices = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const voices = await voiceService.initializeVoices();
        dispatch({ type: 'SET_VOICES', payload: voices });
        
        // Load saved preferences
        const savedVoice = localStorage.getItem('tts-selected-voice');
        const savedFavorites = localStorage.getItem('tts-favorite-voices');
        
        if (savedVoice) {
          const voice = voices.find(v => v.id === savedVoice);
          if (voice) {
            dispatch({ type: 'SET_SELECTED_VOICE', payload: voice });
          }
        }
        
        if (savedFavorites) {
          dispatch({ type: 'SET_FAVORITES', payload: JSON.parse(savedFavorites) });
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load voices' });
      }
    };

    initVoices();
  }, []);

  // Filter voices based on current filters
  const filteredVoices = React.useMemo(() => {
    let filtered = state.voices;

    // Search filter
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(voice => 
        voice.name.toLowerCase().includes(search) ||
        voice.lang.toLowerCase().includes(search)
      );
    }

    // Language filter
    if (state.filters.language) {
      filtered = filtered.filter(voice => 
        voice.lang.startsWith(state.filters.language)
      );
    }

    // Gender filter
    if (state.filters.gender) {
      filtered = filtered.filter(voice => voice.gender === state.filters.gender);
    }

    // Quality filter
    if (state.filters.quality) {
      filtered = filtered.filter(voice => voice.quality === state.filters.quality);
    }

    // Favorites filter
    if (state.filters.showFavoritesOnly) {
      filtered = filtered.filter(voice => state.favorites.includes(voice.id));
    }

    return filtered;
  }, [state.voices, state.filters, state.favorites]);

  const previewVoice = async (voice: Voice) => {
    try {
      dispatch({ type: 'SET_PLAYING', payload: true });
      await voiceService.previewVoice(voice, state.previewText);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to preview voice' });
    } finally {
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  };

  const stopPreview = () => {
    voiceService.stopPreview();
    dispatch({ type: 'SET_PLAYING', payload: false });
  };

  const selectVoice = (voice: Voice) => {
    dispatch({ type: 'SET_SELECTED_VOICE', payload: voice });
    localStorage.setItem('tts-selected-voice', voice.id);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'VOICE_SELECTED',
      voice: voice
    });
  };

  const toggleFavorite = (voiceId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: voiceId });
    
    // Update favorites in reducer, then save to localStorage
    const newFavorites = state.favorites.includes(voiceId)
      ? state.favorites.filter(id => id !== voiceId)
      : [...state.favorites, voiceId];
    
    localStorage.setItem('tts-favorite-voices', JSON.stringify(newFavorites));
  };

  const value: VoiceContextType = {
    state,
    dispatch,
    filteredVoices,
    previewVoice,
    stopPreview,
    selectVoice,
    toggleFavorite
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};
```

### Step 4: Voice Selection Components

```typescript
// src/popup/components/voice/VoiceSelection.tsx
import React from 'react';
import { VoiceProvider } from '../../contexts/VoiceContext';
import { VoiceFilters } from './VoiceFilters';
import { VoiceList } from './VoiceList';
import { VoicePreview } from './VoicePreview';

export const VoiceSelection: React.FC = () => {
  return (
    <VoiceProvider>
      <div className="space-y-4">
        <VoiceFilters />
        <VoicePreview />
        <VoiceList />
      </div>
    </VoiceProvider>
  );
};
```

```typescript
// src/popup/components/voice/VoiceFilters.tsx
import React from 'react';
import { Search, Filter, Star } from 'lucide-react';
import { useVoice } from '../../contexts/VoiceContext';

export const VoiceFilters: React.FC = () => {
  const { state, dispatch } = useVoice();

  const handleFilterChange = (key: string, value: string | boolean) => {
    dispatch({ 
      type: 'SET_FILTERS', 
      payload: { [key]: value }
    });
  };

  const uniqueLanguages = React.useMemo(() => {
    const languages = state.voices.map(voice => ({
      code: voice.lang.split('-')[0],
      name: voice.lang.split('-')[0].toUpperCase()
    }));
    return Array.from(new Map(languages.map(lang => [lang.code, lang])).values());
  }, [state.voices]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search voices..."
          value={state.filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2">
        {/* Language Filter */}
        <select
          value={state.filters.language}
          onChange={(e) => handleFilterChange('language', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Languages</option>
          {uniqueLanguages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>

        {/* Gender Filter */}
        <select
          value={state.filters.gender}
          onChange={(e) => handleFilterChange('gender', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="neutral">Neutral</option>
        </select>

        {/* Quality Filter */}
        <select
          value={state.filters.quality}
          onChange={(e) => handleFilterChange('quality', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Quality</option>
          <option value="neural">Neural</option>
          <option value="premium">Premium</option>
          <option value="standard">Standard</option>
        </select>

        {/* Favorites Toggle */}
        <button
          onClick={() => handleFilterChange('showFavoritesOnly', !state.filters.showFavoritesOnly)}
          className={`
            flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors
            ${state.filters.showFavoritesOnly
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }
          `}
        >
          <Star className={`h-3 w-3 ${state.filters.showFavoritesOnly ? 'fill-current' : ''}`} />
          <span>Favorites</span>
        </button>
      </div>

      {/* Results Count */}
      <div className="text-xs text-gray-500">
        {state.filteredVoices?.length || 0} voices found
      </div>
    </div>
  );
};
```

```typescript
// src/popup/components/voice/VoiceList.tsx
import React from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { VoiceCard } from './VoiceCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const VoiceList: React.FC = () => {
  const { state, filteredVoices } = useVoice();

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-800">{state.error}</p>
      </div>
    );
  }

  if (filteredVoices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No voices found matching your criteria.</p>
        <p className="text-sm mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  // Group voices by category for display
  const categories = state.categories.filter(category => 
    category.voices.some(voice => filteredVoices.includes(voice))
  );

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto">
      {categories.map(category => {
        const categoryVoices = category.voices.filter(voice => 
          filteredVoices.includes(voice)
        );
        
        if (categoryVoices.length === 0) return null;

        return (
          <div key={category.languageCode} className="space-y-2">
            <h3 className="flex items-center space-x-2 text-sm font-medium text-gray-700 sticky top-0 bg-white py-1">
              <span>{category.flag}</span>
              <span>{category.language}</span>
              <span className="text-xs text-gray-500">({categoryVoices.length})</span>
            </h3>
            
            <div className="space-y-1">
              {categoryVoices.map(voice => (
                <VoiceCard 
                  key={voice.id} 
                  voice={voice}
                  isSelected={state.selectedVoice?.id === voice.id}
                  isFavorite={state.favorites.includes(voice.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

```typescript
// src/popup/components/voice/VoiceCard.tsx
import React from 'react';
import { Play, Pause, Star, Crown, Zap } from 'lucide-react';
import { Voice } from '../../types/voice.types';
import { useVoice } from '../../contexts/VoiceContext';

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isFavorite: boolean;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({ 
  voice, 
  isSelected, 
  isFavorite 
}) => {
  const { state, previewVoice, stopPreview, selectVoice, toggleFavorite } = useVoice();

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.isPlaying) {
      stopPreview();
    } else {
      previewVoice(voice);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(voice.id);
  };

  const handleSelect = () => {
    selectVoice(voice);
  };

  const getQualityIcon = () => {
    switch (voice.quality) {
      case 'neural':
        return <Zap className="h-3 w-3 text-purple-500" title="Neural Voice" />;
      case 'premium':
        return <Crown className="h-3 w-3 text-yellow-500" title="Premium Voice" />;
      default:
        return null;
    }
  };

  const getGenderColor = () => {
    switch (voice.gender) {
      case 'male':
        return 'text-blue-600';
      case 'female':
        return 'text-pink-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`
        p-3 rounded-lg border cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {voice.name}
            </h4>
            {getQualityIcon()}
            {voice.default && (
              <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                Default
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500">
              {voice.lang}
            </span>
            <span className={`text-xs ${getGenderColor()}`}>
              {voice.gender}
            </span>
            <span className="text-xs text-gray-500">
              {voice.localService ? 'Local' : 'Online'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={handleFavorite}
            className={`
              p-1 rounded-full transition-colors
              ${isFavorite
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-400 hover:text-gray-600'
              }
            `}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handlePreview}
            disabled={state.isPlaying}
            className="p-1 rounded-full text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
            title="Preview voice"
          >
            {state.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
```

```typescript
// src/popup/components/voice/VoicePreview.tsx
import React from 'react';
import { Edit3, Volume2 } from 'lucide-react';
import { useVoice } from '../../contexts/VoiceContext';

export const VoicePreview: React.FC = () => {
  const { state, dispatch, previewVoice, stopPreview } = useVoice();

  const handlePreviewTextChange = (text: string) => {
    dispatch({ type: 'SET_PREVIEW_TEXT', payload: text });
  };

  const handlePreview = async () => {
    if (!state.selectedVoice) return;
    
    if (state.isPlaying) {
      stopPreview();
    } else {
      await previewVoice(state.selectedVoice);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
          <Volume2 className="h-4 w-4" />
          <span>Voice Preview</span>
        </h3>
        
        {state.selectedVoice && (
          <button
            onClick={handlePreview}
            disabled={!state.selectedVoice}
            className={`
              px-3 py-1 rounded-md text-sm font-medium transition-colors
              ${state.isPlaying
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
              }
            `}
          >
            {state.isPlaying ? 'Stop' : 'Preview'}
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          value={state.previewText}
          onChange={(e) => handlePreviewTextChange(e.target.value)}
          placeholder="Enter text to preview with selected voice..."
          className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
        <Edit3 className="absolute top-2 right-2 h-4 w-4 text-gray-400" />
      </div>

      {state.selectedVoice && (
        <div className="text-xs text-gray-600 bg-white rounded p-2">
          <strong>Selected:</strong> {state.selectedVoice.name} ({state.selectedVoice.lang})
        </div>
      )}
    </div>
  );
};
```

## Testing Criteria and Test Cases

### Unit Tests

```typescript
// src/popup/services/__tests__/voiceService.test.ts
import { VoiceService } from '../voiceService';

describe('VoiceService', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    voiceService = VoiceService.getInstance();
    
    // Mock speechSynthesis
    global.speechSynthesis = {
      getVoices: jest.fn().mockReturnValue([
        {
          name: 'Alex',
          lang: 'en-US',
          localService: true,
          default: true,
          voiceURI: 'Alex'
        },
        {
          name: 'Samantha',
          lang: 'en-US',
          localService: true,
          default: false,
          voiceURI: 'Samantha'
        }
      ]),
      cancel: jest.fn(),
      speak: jest.fn(),
      addEventListener: jest.fn()
    } as any;
  });

  test('initializes voices correctly', async () => {
    const voices = await voiceService.initializeVoices();
    
    expect(voices).toHaveLength(2);
    expect(voices[0].name).toBe('Alex');
    expect(voices[0].gender).toBe('male');
  });

  test('categorizes voices by language', () => {
    const voices = [
      { id: '1', name: 'Alex', lang: 'en-US', gender: 'male' as const, quality: 'standard' as const, localService: true, default: true, voiceURI: 'Alex' },
      { id: '2', name: 'Marie', lang: 'fr-FR', gender: 'female' as const, quality: 'standard' as const, localService: true, default: false, voiceURI: 'Marie' }
    ];

    const categories = voiceService.categorizeVoices(voices);
    
    expect(categories).toHaveLength(2);
    expect(categories[0].language).toBe('English');
    expect(categories[1].language).toBe('French');
  });

  test('detects gender correctly', () => {
    // Test is implemented within the service initialization
    expect(voiceService['detectGender']('Alex')).toBe('male');
    expect(voiceService['detectGender']('Samantha')).toBe('female');
    expect(voiceService['detectGender']('Robot Voice')).toBe('neutral');
  });
});
```

### Integration Tests

```typescript
// src/popup/components/__tests__/VoiceSelection.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceSelection } from '../voice/VoiceSelection';

// Mock speech synthesis
const mockVoices = [
  {
    name: 'Alex',
    lang: 'en-US',
    localService: true,
    default: true,
    voiceURI: 'Alex'
  },
  {
    name: 'Marie',
    lang: 'fr-FR',
    localService: true,
    default: false,
    voiceURI: 'Marie'
  }
];

beforeEach(() => {
  global.speechSynthesis = {
    getVoices: () => mockVoices,
    cancel: jest.fn(),
    speak: jest.fn(),
    addEventListener: jest.fn((event, callback) => {
      if (event === 'voiceschanged') {
        setTimeout(callback, 0);
      }
    })
  } as any;

  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  } as any;
});

describe('VoiceSelection Integration', () => {
  test('loads and displays voices', async () => {
    render(<VoiceSelection />);
    
    await waitFor(() => {
      expect(screen.getByText('Alex')).toBeInTheDocument();
      expect(screen.getByText('Marie')).toBeInTheDocument();
    });
  });

  test('filters voices by search', async () => {
    render(<VoiceSelection />);
    
    await waitFor(() => {
      expect(screen.getByText('Alex')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search voices...');
    fireEvent.change(searchInput, { target: { value: 'Alex' } });

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByText('Marie')).not.toBeInTheDocument();
  });

  test('selects voice and saves to localStorage', async () => {
    render(<VoiceSelection />);
    
    await waitFor(() => {
      expect(screen.getByText('Alex')).toBeInTheDocument();
    });

    const alexCard = screen.getByText('Alex').closest('div');
    fireEvent.click(alexCard!);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'tts-selected-voice',
      expect.stringContaining('Alex')
    );
  });

  test('toggles favorites', async () => {
    render(<VoiceSelection />);
    
    await waitFor(() => {
      expect(screen.getByText('Alex')).toBeInTheDocument();
    });

    const favoriteButton = screen.getAllByTitle('Add to favorites')[0];
    fireEvent.click(favoriteButton);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'tts-favorite-voices',
      expect.any(String)
    );
  });

  test('previews voice', async () => {
    const mockSpeak = jest.fn();
    global.speechSynthesis.speak = mockSpeak;

    render(<VoiceSelection />);
    
    await waitFor(() => {
      expect(screen.getByText('Alex')).toBeInTheDocument();
    });

    const previewButton = screen.getAllByTitle('Preview voice')[0];
    fireEvent.click(previewButton);

    expect(mockSpeak).toHaveBeenCalled();
  });
});
```

### E2E Tests

```typescript
// e2e/voice-selection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Voice Selection E2E', () => {
  test('voice selection workflow', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Wait for voices to load
    await expect(page.locator('[data-testid="voice-list"]')).toBeVisible();
    
    // Search for a voice
    await page.fill('input[placeholder="Search voices..."]', 'English');
    await expect(page.locator('text=English')).toBeVisible();
    
    // Select a voice
    const firstVoice = page.locator('[data-testid="voice-card"]').first();
    await firstVoice.click();
    await expect(firstVoice).toHaveClass(/border-blue-500/);
    
    // Add to favorites
    await firstVoice.locator('[title="Add to favorites"]').click();
    
    // Filter by favorites
    await page.click('text=Favorites');
    await expect(page.locator('[data-testid="voice-card"]')).toHaveCount(1);
    
    // Preview voice
    await page.click('[title="Preview voice"]');
    await expect(page.locator('text=Stop')).toBeVisible();
  });

  test('voice preview functionality', async ({ page }) => {
    await page.goto('chrome-extension://extension-id/popup.html');
    
    // Wait for voices to load
    await page.waitForSelector('[data-testid="voice-list"]');
    
    // Select a voice
    await page.click('[data-testid="voice-card"]');
    
    // Change preview text
    await page.fill('textarea', 'This is a custom preview text');
    
    // Click preview
    await page.click('text=Preview');
    
    // Should show stop button while playing
    await expect(page.locator('text=Stop')).toBeVisible();
  });
});
```

## Success Metrics

### Performance Metrics
- **Voice Loading**: Voices load within 200ms
- **Search Response**: Search results update within 50ms
- **Preview Latency**: Voice preview starts within 100ms
- **Memory Usage**: Voice selection uses under 20MB memory

### User Experience Metrics
- **Voice Discovery**: Users find desired voice within 30 seconds
- **Preview Usage**: 80%+ of users preview voices before selection
- **Favorite Adoption**: 60%+ of users mark at least one voice as favorite
- **Selection Persistence**: 95%+ accuracy in remembering voice selection

### Technical Metrics
- **Error Rate**: Less than 2% of voice operations fail
- **Cross-platform Compatibility**: 98%+ compatibility across OS/browsers
- **Accessibility Score**: Perfect keyboard navigation and screen reader support
- **Test Coverage**: 95%+ code coverage

## Dependencies and Risks

### Internal Dependencies
- **Speech Synthesis API**: Core browser API for voice functionality
- **React Context**: State management for voice data
- **Local Storage**: Persistence of user preferences
- **Chrome Extension APIs**: Message passing for voice selection

### External Dependencies
- **Browser Voice Support**: Varies by OS and browser
- **System Voices**: Dependent on installed system voices
- **Online Voices**: Network connectivity for cloud voices
- **Speech Synthesis Permissions**: Browser security restrictions

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Limited Voice Availability | High | Medium | Graceful degradation, fallback voices |
| Speech Synthesis API Changes | High | Low | API compatibility layer, feature detection |
| Cross-browser Differences | Medium | High | Comprehensive testing, polyfills |
| Performance with Many Voices | Medium | Medium | Virtual scrolling, pagination |
| Audio Permissions | Medium | Low | Clear permission prompts, error handling |

### Mitigation Strategies

1. **Voice Availability**: Implement fallback mechanisms and clear messaging when voices are unavailable
2. **API Compatibility**: Use feature detection and provide graceful degradation
3. **Performance**: Implement virtual scrolling for large voice lists
4. **Testing**: Comprehensive cross-browser and cross-platform testing
5. **User Education**: Clear documentation and helpful error messages

### Rollback Plan
- Maintain previous voice selection functionality as fallback
- Progressive enhancement approach for new features
- Feature flags for gradual rollout
- Quick disable mechanism for problematic features