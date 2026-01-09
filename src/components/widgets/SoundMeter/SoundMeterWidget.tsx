import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react'; // <-- Se ha separado la importación del tipo FC
import { useTranslation } from 'react-i18next';
import type { WidgetConfig } from '../../../types';
import { Mic, MicOff } from 'lucide-react';
import './SoundMeter.css';
import { withBaseUrl } from '../../../utils/assetPaths';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

// ... (El resto del archivo no necesita cambios)
type NoiseLevel = 'silence' | 'conversation' | 'noise';

interface LevelInfo {
  labelKey: string;
  emoji: string;
  className: string;
}

interface ThresholdsConfig {
  silenceMax: number;
  conversationMax: number;
}

const DEFAULT_THRESHOLDS: ThresholdsConfig = {
  silenceMax: 15,
  conversationMax: 45,
};

const THRESHOLD_PRESETS: Record<'quiet' | 'classroom' | 'noisy', ThresholdsConfig> = {
  quiet: {
    silenceMax: 12,
    conversationMax: 45,
  },
  classroom: {
    silenceMax: 25,
    conversationMax: 90,
  },
  noisy: {
    silenceMax: 45,
    conversationMax: 140,
  },
};

const MIN_GAP = 5;
const MAX_LEVEL_VALUE = 255;

const LEVEL_CONFIG: Record<NoiseLevel, LevelInfo> = {
  silence: {
    labelKey: 'widgets.sound_meter.silence',
    emoji: '🤫',
    className: 'level-silence',
  },
  conversation: {
    labelKey: 'widgets.sound_meter.conversation',
    emoji: '🗣️',
    className: 'level-conversation',
  },
  noise: {
    labelKey: 'widgets.sound_meter.noise',
    emoji: '💥',
    className: 'level-noise',
  },
};

const getAudioContextConstructor = (): typeof AudioContext | undefined => {
  const win = window as Window & { webkitAudioContext?: typeof AudioContext };
  return win.AudioContext ?? win.webkitAudioContext;
};

export const SoundMeterWidget: FC = () => {
  const { t } = useTranslation();
  const [currentLevel, setCurrentLevel] = useState<NoiseLevel>('silence');
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [thresholds, setThresholds] = useLocalStorage<ThresholdsConfig>(
    'widgets.sound_meter.thresholds',
    DEFAULT_THRESHOLDS
  );
  const thresholdsRef = useRef<ThresholdsConfig>(thresholds);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const animationFrameRef = useRef<number | undefined>(undefined);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  const getLevelFromVolume = (volume: number, config: ThresholdsConfig): NoiseLevel => {
    if (volume < config.silenceMax) return 'silence';
    if (volume < config.conversationMax) return 'conversation';
    return 'noise';
  };

  const updateSilenceMax = (value: number) => {
    setThresholds((prev) => {
      const nextSilence = clamp(value, 0, prev.conversationMax - MIN_GAP);
      return { ...prev, silenceMax: nextSilence };
    });
  };

  const updateConversationMax = (value: number) => {
    setThresholds((prev) => {
      const minConversation = prev.silenceMax + MIN_GAP;
      const nextConversation = clamp(value, minConversation, MAX_LEVEL_VALUE);
      return { ...prev, conversationMax: nextConversation };
    });
  };

  const applyPreset = (preset: keyof typeof THRESHOLD_PRESETS) => {
    const next = THRESHOLD_PRESETS[preset];
    const nextSilence = clamp(next.silenceMax, 0, next.conversationMax - MIN_GAP);
    const nextConversation = clamp(next.conversationMax, nextSilence + MIN_GAP, MAX_LEVEL_VALUE);
    setThresholds({ silenceMax: nextSilence, conversationMax: nextConversation });
  };
  
  const startMeter = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(t('widgets.sound_meter.no_audio_support'));
        setPermission('denied');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      
      const AudioContextConstructor = getAudioContextConstructor();
      if (!AudioContextConstructor) {
        alert(t('widgets.sound_meter.no_audio_support'));
        setPermission('denied');
        return;
      }
      audioContextRef.current = new AudioContextConstructor();
      const analyser = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setPermission('granted');
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setCurrentLevel(getLevelFromVolume(average, thresholdsRef.current));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();

    } catch (err) {
      console.error(t('widgets.sound_meter.microphone_error'), err);
      setPermission('denied');
    }
  };

  const stopMeter = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    return () => stopMeter();
  }, []);

  const renderContent = () => {
    if (permission === 'granted') {
      const { labelKey, emoji, className } = LEVEL_CONFIG[currentLevel];
      return (
        <div className={`level-card ${className}`}>
          <span className="emoji">{emoji}</span>
          <span className="label">{t(labelKey)}</span>
        </div>
      );
    }
    
    return (
      <div className="permission-screen">
        {permission === 'denied' ? (
          <>
            <MicOff size={48} className="text-red-500" />
            <p>{t('widgets.sound_meter.access_denied')}</p>
            <small>{t('widgets.sound_meter.enable_browser_settings')}</small>
          </>
        ) : (
          <>
            <Mic size={48} />
            <p>{t('widgets.sound_meter.permission_needed')}</p>
            <button onClick={startMeter} className="permission-button">
              {t('widgets.sound_meter.activate_meter')}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="sound-meter-widget">
      {renderContent()}
      <div className="meter-controls">
        <div className="controls-header">{t('widgets.sound_meter.thresholds_title')}</div>
        <div className="preset-buttons" role="group" aria-label={t('widgets.sound_meter.presets_title')}>
          <button type="button" className="preset-button" onClick={() => applyPreset('quiet')}>
            {t('widgets.sound_meter.preset_quiet')}
          </button>
          <button type="button" className="preset-button" onClick={() => applyPreset('classroom')}>
            {t('widgets.sound_meter.preset_classroom')}
          </button>
          <button type="button" className="preset-button" onClick={() => applyPreset('noisy')}>
            {t('widgets.sound_meter.preset_noisy')}
          </button>
        </div>
        <label className="control-row">
          <span>{t('widgets.sound_meter.silence_limit')}</span>
          <input
            type="range"
            min={0}
            max={MAX_LEVEL_VALUE}
            step={1}
            value={thresholds.silenceMax}
            onChange={(event) => updateSilenceMax(Number(event.target.value))}
          />
          <span className="control-value">{thresholds.silenceMax}</span>
        </label>
        <label className="control-row">
          <span>{t('widgets.sound_meter.conversation_limit')}</span>
          <input
            type="range"
            min={0}
            max={MAX_LEVEL_VALUE}
            step={1}
            value={thresholds.conversationMax}
            onChange={(event) => updateConversationMax(Number(event.target.value))}
          />
          <span className="control-value">{thresholds.conversationMax}</span>
        </label>
      </div>
    </div>
  );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'sound-meter',
  title: 'widgets.sound_meter.title',
  icon: (() => {
    const WidgetIcon: React.FC = () => {
      const { t } = useTranslation();
      return <img src={withBaseUrl('icons/SoundMeter.png')} alt={t('widgets.sound_meter.title')} width={52} height={52} />;
    };
    return <WidgetIcon />;
  })(),
  defaultSize: { width: 300, height: 300 },
};
