import { useState, useEffect, useCallback } from 'react';

export function useDevices() {
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');

  const enumerate = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices.filter((d) => d.kind === 'audioinput');
      const video = devices.filter((d) => d.kind === 'videoinput');
      setAudioDevices(audio);
      setVideoDevices(video);

      // Auto-select first device if nothing selected
      if (!selectedAudioId && audio.length) setSelectedAudioId(audio[0].deviceId);
      if (!selectedVideoId && video.length) setSelectedVideoId(video[0].deviceId);
    } catch (e) {
      console.error('Failed to enumerate devices:', e);
    }
  }, [selectedAudioId, selectedVideoId]);

  useEffect(() => {
    enumerate();
    // Re-enumerate when devices change (plug/unplug)
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerate);
    };
  }, [enumerate]);

  return {
    audioDevices,
    videoDevices,
    selectedAudioId,
    selectedVideoId,
    setSelectedAudioId,
    setSelectedVideoId,
  };
}
