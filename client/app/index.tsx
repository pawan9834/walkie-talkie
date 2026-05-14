import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Modal, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Mic, Globe, X, Hash, Dices, Search } from 'lucide-react-native';
import socketService from '../src/services/socket';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [nickname, setNickname] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Systems...');
  const [activeFrequencies, setActiveFrequencies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkNickname();
  }, []);

  const checkNickname = async () => {
    const socket = socketService.getSocket();
    
    setIsConnected(socket.connected);

    socket.on('connect', () => {
      setIsConnected(true);
      setStatusMessage('Connected to Global Hub');
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setStatusMessage('Connection Error');
      // Show alert to debug URL issues on device
      Alert.alert(
        'Signal Lost',
        `Could not connect to ${socketService.getSocket().io.uri}. \n\nError: ${err.message}`,
        [{ text: 'Retry', onPress: () => socket.connect() }]
      );
    });

    socket.on('active-frequencies', (frequencies: string[]) => {
      setActiveFrequencies(frequencies);
      setIsScanning(false);
    });

    try {
      const storedNickname = await SecureStore.getItemAsync('nickname');
      if (storedNickname) {
        setNickname(storedNickname);
        setStatusMessage(`Welcome back, ${storedNickname}`);
        setTimeout(() => {
          router.replace('/home');
        }, 2000);
      } else {
        setStatusMessage('System Ready');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  };

  const startScan = () => {
    setIsScanning(true);
    setScanModalVisible(true);
    socketService.getSocket().emit('get-active-frequencies');
  };

  const joinRandom = () => {
    if (activeFrequencies.length === 0) return;
    const randomFreq = activeFrequencies[Math.floor(Math.random() * activeFrequencies.length)];
    setScanModalVisible(false);
    router.push(`/room/${randomFreq}`);
  };

  const saveNickname = async () => {
    if (nickname.trim().length < 2) return;
    try {
      await SecureStore.setItemAsync('nickname', nickname.trim());
      router.replace('/home');
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLoaded) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Mic size={60} color="#00FF88" strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Walkie Talkie</Text>
        <Text style={styles.subtitle}>Over the air, anywhere.</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Set your nickname</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Maverick"
          placeholderTextColor="#666"
          value={nickname}
          onChangeText={setNickname}
          autoFocus={!nickname}
        />
        <TouchableOpacity
          style={[styles.button, nickname.length < 2 && styles.buttonDisabled]}
          onPress={saveNickname}
          disabled={nickname.length < 2}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#00FF88' : '#FFBB00' }]} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <TouchableOpacity
          style={styles.discoverButton}
          onPress={startScan}
        >
          <Globe size={20} color="#00D1FF" />
          <Text style={styles.discoverButtonText}>Discover Open Channels</Text>
        </TouchableOpacity>
      </View>

      {/* Scan Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={scanModalVisible}
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Frequency Scanner</Text>
              <TouchableOpacity onPress={() => setScanModalVisible(false)}>
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
              <Search size={18} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search frequencies..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={styles.randomButtonSmall}
                onPress={joinRandom}
                disabled={activeFrequencies.length === 0}
              >
                <Dices size={18} color={activeFrequencies.length > 0 ? "#00FF88" : "#444"} />
              </TouchableOpacity>
            </View>

            {isScanning ? (
              <View style={styles.scanningContainer}>
                <Text style={styles.scanningText}>Scanning airwaves...</Text>
              </View>
            ) : (
              <FlatList
                data={activeFrequencies.filter(f => f.includes(searchQuery.toLowerCase()))}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.recentItem}
                    onPress={async () => {
                      if (nickname.trim().length < 2) {
                        alert('Please set a nickname first to join!');
                        setScanModalVisible(false);
                        return;
                      }
                      await SecureStore.setItemAsync('nickname', nickname.trim());
                      setScanModalVisible(false);
                      router.push(`/room/${item}`);
                    }}
                  >
                    <View style={[styles.frequencyIcon, { backgroundColor: '#00D1FF15' }]}>
                      <Hash size={18} color="#00D1FF" />
                    </View>
                    <Text style={styles.recentItemText}>{item}</Text>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.refreshButton]}
              onPress={() => socketService.getSocket().emit('get-active-frequencies')}
            >
              <Text style={styles.refreshButtonText}>Refresh Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#00FF88',
    marginTop: 5,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    color: '#AAAAAA',
    marginBottom: 10,
    fontSize: 14,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 18,
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#00FF88',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  discoverButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 10,
  },
  discoverButtonText: {
    color: '#00D1FF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 12,
    fontSize: 14,
  },
  randomButtonSmall: {
    padding: 10,
    marginLeft: 5,
  },
  scanningContainer: {
    padding: 40,
    alignItems: 'center',
  },
  scanningText: {
    color: '#00D1FF',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  frequencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recentItemText: {
    fontSize: 16,
    color: '#EEE',
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#FF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
    marginRight: 6,
  },
  liveText: {
    color: '#FF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#00D1FF20',
    borderWidth: 1,
    borderColor: '#00D1FF',
  },
  refreshButtonText: {
    color: '#00D1FF',
    fontWeight: 'bold',
  },
});
