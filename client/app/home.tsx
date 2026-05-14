import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Plus, Hash, History, Settings, LogOut, Radio, Search, Globe, X, Dices } from 'lucide-react-native';
import socketService from '../src/services/socket';

export default function HomeScreen() {
  const [recentFrequencies, setRecentFrequencies] = useState<string[]>([]);
  const [nickname, setNickname] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [frequencyName, setFrequencyName] = useState('');
  const [modalType, setModalType] = useState<'create' | 'join'>('join');
  const [activeFrequencies, setActiveFrequencies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('🛰️ Searching for Signal...');
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const storedNickname = await SecureStore.getItemAsync('nickname');
    setNickname(storedNickname || 'User');

    const storedRecent = await SecureStore.getItemAsync('recent_frequencies');
    if (storedRecent) {
      setRecentFrequencies(JSON.parse(storedRecent));
    }

    const socket = socketService.getSocket();
    
    setIsConnected(socket.connected);
    if (socket.connected) setStatusMessage('📡 Signal: Online');

    socket.on('connect', () => {
      setIsConnected(true);
      setStatusMessage('📡 Signal: Online');
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setStatusMessage('🛰️ Reconnecting...');
    });

    socket.on('active-frequencies', (frequencies: string[]) => {
      setActiveFrequencies(frequencies);
      setIsScanning(false);
    });
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

  const handleAction = async () => {
    if (!frequencyName.trim()) return;

    const formattedName = frequencyName.trim().toLowerCase().replace(/\s+/g, '-');

    // Save to recent
    const updatedRecent = [formattedName, ...recentFrequencies.filter(f => f !== formattedName)].slice(0, 5);
    await SecureStore.setItemAsync('recent_frequencies', JSON.stringify(updatedRecent));

    setModalVisible(false);
    setFrequencyName('');

    router.push(`/room/${formattedName}`);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('nickname');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Connection Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: isConnected ? '#00FF8815' : '#FFBB0015' }]}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#00FF88' : '#FFBB00' }]} />
        <Text style={[styles.statusText, { color: isConnected ? '#00FF88' : '#FFBB00' }]}>{statusMessage}</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Echo Base,</Text>
          <Text style={styles.nickname}>{nickname}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.iconButton}>
          <LogOut size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#00FF8820', borderColor: '#00FF88' }]}
          onPress={() => { setModalType('create'); setModalVisible(true); }}
        >
          <Plus size={32} color="#00FF88" />
          <Text style={styles.actionTitle}>Create</Text>
          <Text style={styles.actionSub}>New Frequency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#FFD70020', borderColor: '#FFD700' }]}
          onPress={() => { setModalType('join'); setModalVisible(true); }}
        >
          <Radio size={32} color="#FFD700" />
          <Text style={styles.actionTitle}>Join</Text>
          <Text style={styles.actionSub}>Existing Channel</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.discoverButton}
        onPress={startScan}
      >
        <Globe size={24} color="#00D1FF" />
        <Text style={styles.discoverButtonText}>Discover Open Channels</Text>
        <View style={styles.livePulse} />
      </TouchableOpacity>

      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <History size={20} color="#666" />
          <Text style={styles.sectionTitle}>Recent Frequencies</Text>
        </View>

        {recentFrequencies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent channels. Start a conversation!</Text>
          </View>
        ) : (
          <FlatList
            data={recentFrequencies}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => router.push(`/room/${item}`)}
              >
                <View style={styles.frequencyIcon}>
                  <Hash size={18} color="#00FF88" />
                </View>
                <Text style={styles.recentItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Create/Join Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'create' ? 'Create Frequency' : 'Join Frequency'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter frequency name..."
              placeholderTextColor="#666"
              value={frequencyName}
              onChangeText={setFrequencyName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAction}
              >
                <Text style={styles.confirmText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scan Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={scanModalVisible}
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
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
                <Text style={styles.scanningText}>Scanning the airwaves...</Text>
              </View>
            ) : (
              <FlatList
                data={activeFrequencies.filter(f => f.includes(searchQuery.toLowerCase()))}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.recentItem}
                    onPress={() => {
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
              style={[styles.modalButton, styles.confirmButton, { marginTop: 20 }]}
              onPress={() => socketService.getSocket().emit('get-active-frequencies')}
            >
              <Text style={styles.confirmText}>Refresh Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 16,
    color: '#888',
  },
  nickname: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 40,
  },
  actionCard: {
    flex: 1,
    height: 140,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 10,
  },
  actionSub: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 4,
  },
  recentSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  frequencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00FF8815',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recentItemText: {
    fontSize: 17,
    color: '#EEE',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#444',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  confirmButton: {
    backgroundColor: '#00FF88',
  },
  cancelText: {
    color: '#AAA',
    fontWeight: 'bold',
  },
  confirmText: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  discoverButton: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#00D1FF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  discoverButtonText: {
    color: '#00D1FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginLeft: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    marginBottom: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
