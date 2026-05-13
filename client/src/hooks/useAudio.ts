import { Audio } from 'expo-av';
import { useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system';

export const useAudio = () => {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const startRecording = async () => {
    if (recordingRef.current || isRecording) {
      console.log('Recording already in progress, ignoring start request.');
      return;
    }

    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
      recordingRef.current = null;
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    
    const currentRecording = recordingRef.current;
    recordingRef.current = null; // Clear immediately
    setIsRecording(false);
    
    if (!currentRecording) return null;

    try {
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      console.log('Recording stopped and stored at', uri);
      
      if (!uri) return null;

      // Check if file exists and has size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || fileInfo.size < 100) {
        console.log('Recording too short, discarding.');
        return null;
      }

      // Convert file to base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64Audio;
    } catch (error: any) {
      // Gracefully handle the 'no valid audio data' error from expo-av
      if (error.message?.includes('no valid audio data')) {
        console.log('Short tap detected, no audio sent.');
      } else {
        console.error('Error stopping recording', error);
      }
      return null;
    }
  };

  const playAudio = async (base64Data: string) => {
    try {
      const uri = `${FileSystem.cacheDirectory}temp_audio.m4a`;
      await FileSystem.writeAsStringAsync(uri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      setSound(sound);
      
      await sound.playAsync();
      
      // Unload after playing
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio', error);
    }
  };

  return {
    startRecording,
    stopRecording,
    playAudio,
    isRecording,
  };
};
