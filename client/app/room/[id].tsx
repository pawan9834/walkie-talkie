import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Mic, X, Users, Signal, Radio, Hash, Zap } from 'lucide-react-native';
import { Audio } from 'expo-av';
import socketService from '../../src/services/socket';
import { useAudio } from '../../src/hooks/useAudio';

export default function FrequencyRoom() {
  const { id: frequency } = useLocalSearchParams();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isTalking, setIsTalking] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const signalAnim = useRef(new Animated.Value(0)).current;
  const { startRecording, stopRecording, playAudio, isRecording } = useAudio();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socket = useRef<any>(null);

  // Radio Station Database
  const RADIO_STATIONS: Record<string, { name: string, stream: string }> = {
    '91.1-radio-city': { name: 'Radio City 91.1', stream: 'https://radiocity.stream.zenolive.com/8m7v1p7r91duv' },
    '98.5-global-fm': { name: 'Global FM', stream: 'https://stream.zeno.fm/s0r7v8v7v8zuv' },
  };

  useEffect(() => {
    init();
    return () => {
      if (sound) sound.unloadAsync();
      socketService.leaveRoom(frequency as string);
    };
  }, [sound]);

  const playRadioStream = async (url: string) => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (error) {
      console.log('Error playing radio stream:', error);
    }
  };

  const startSignalAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(signalAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(signalAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const init = async () => {
    const storedNickname = await SecureStore.getItemAsync('nickname');
    const name = storedNickname || 'Unknown';
    setNickname(name);

    socket.current = socketService.getSocket();

    setIsConnected(socket.current.connected);

    socket.current.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      // Re-join if we were disconnected
      socketService.joinRoom(frequency as string, name);
    });

    socket.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      setOnlineUsers([]);
    });

    // Add listener BEFORE joining
    socket.current.on('room-users', (users: string[]) => {
      console.log('👥 Updated online users:', users);
      setOnlineUsers(users);
    });

    socket.current.on('incoming-audio', ({ audioChunk, senderNickname }: any) => {
      console.log(`🔊 Incoming audio from ${senderNickname}`);
      setIsTalking(senderNickname);
      playAudio(audioChunk);

      // Reset talking indicator after some time or when audio finishes
      setTimeout(() => setIsTalking(null), 3000);
    });

    socketService.joinRoom(frequency as string, name);

    // Check for Radio Mode
    const station = RADIO_STATIONS[frequency as string];
    if (station) {
      setIsRadioMode(true);
      playRadioStream(station.stream);
      startSignalAnimation();
    }

    socket.current.on('user-joined', ({ nickname: joinedName }: any) => {
      console.log(`${joinedName} joined`);
    });
  };

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handlePressIn = async () => {
    Vibration.vibrate(50);
    await startRecording();
  };

  const handlePressOut = async () => {
    const audioData = await stopRecording();
    if (audioData) {
      console.log('✅ Audio captured, broadcasting...');
      socketService.sendAudio(frequency as string, audioData, nickname);
    } else {
      console.log('⚠️ No audio data captured (tap was too short)');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `FREQ: ${frequency}`,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X color="#FFF" size={24} />
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.roomHeader}>
        <View style={styles.roomIconContainer}>
          <Hash size={24} color="#00FF88" />
        </View>
        <View>
          <Text style={styles.roomName}>{frequency}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#00FF88' : '#FF4444' }]} />
            <Text style={styles.statusText}>{isConnected ? (isRadioMode ? 'RECEIVING SIGNAL' : 'LIVE SIGNAL') : 'OFFLINE'}</Text>
          </View>
        </View>
      </View>

      {isRadioMode && (
        <View style={styles.radioPlayerContainer}>
          <View style={styles.radioHeader}>
            <Radio size={20} color="#00FF88" />
            <Text style={styles.radioTitle}>LIVE BROADCAST</Text>
          </View>
          <View style={styles.signalMeter}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Animated.View 
                key={i} 
                style={[
                  styles.signalBar, 
                  { 
                    height: 10 + (i * 6), 
                    opacity: signalAnim,
                    backgroundColor: i <= 4 ? '#00FF88' : '#00FF8840'
                  }
                ]} 
              />
            ))}
          </View>
          <Text style={styles.receivingText}>Streaming Radio City 91.1 Live...</Text>
        </View>
      )}

      <View style={styles.displayArea}>
        {isTalking ? (
          <View style={styles.talkingIndicator}>
            <Radio size={40} color="#00FF88" />
            <Text style={styles.talkingText}>{isTalking} is talking...</Text>
          </View>
        ) : (
          <View style={styles.idleDisplay}>
            <Text style={styles.idleText}>READY TO TRANSMIT</Text>
          </View>
        )}
      </View>

      <View style={styles.usersListContainer}>
        <Text style={styles.listTitle}>Participants</Text>
        <FlatList
          horizontal
          data={onlineUsers}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.userTag}>
              <View style={styles.userDot} />
              <Text style={styles.userTagName}>{item === nickname ? 'You' : item}</Text>
            </View>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.pttContainer}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: isRecording ? 0.3 : 0 }]} />
        <TouchableOpacity
          activeOpacity={0.8}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.pttButton, isRecording && styles.pttButtonActive]}
        >
          <Mic size={50} color={isRecording ? "#000" : "#00FF88"} />
          <Text style={[styles.pttLabel, { color: isRecording ? "#000" : "#00FF88" }]}>
            {isRecording ? "TRANSMITTING..." : "PUSH TO TALK"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hintText}>Hold the button to speak to everyone on this frequency.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  roomIconContainer: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 15,
  },
  roomName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#666',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  displayArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#222',
    marginVertical: 20,
  },
  talkingIndicator: {
    alignItems: 'center',
    gap: 15,
  },
  talkingText: {
    color: '#00FF88',
    fontSize: 20,
    fontWeight: 'bold',
  },
  idleDisplay: {
    opacity: 0.3,
  },
  idleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  usersListContainer: {
    marginBottom: 40,
  },
  listTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  userTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
    marginRight: 8,
  },
  userTagName: {
    color: '#EEE',
    fontSize: 14,
  },
  pttContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pulseCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#00FF88',
  },
  pttButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  pttButtonActive: {
    backgroundColor: '#00FF88',
  },
  pttLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  radioPlayerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF8830',
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  radioTitle: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  signalMeter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 40,
    marginBottom: 15,
  },
  signalBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
  },
  receivingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  hintText: {
    color: '#444',
    textAlign: 'center',
    fontSize: 12,
  },
});
