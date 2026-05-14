import { io } from 'socket.io-client';

// For cloud deployment, use your Render URL.
// Replace this with your actual Render URL if it differs from the one below.
const SOCKET_URL = 'https://walkie-talkie-server.onrender.com';

class SocketService {
  socket: any;

  connect() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to socket server');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ Disconnected from socket server:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('⚠️ Connection Error! Make sure your IP is correct and phone is on the same Wi-Fi:', error.message);
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  joinRoom(frequency: string, nickname: string) {
    this.socket?.emit('join-frequency', { frequency, nickname });
  }

  leaveRoom(frequency: string) {
    this.socket?.emit('leave-frequency', { frequency });
  }

  sendAudio(frequency: string, audioChunk: string, senderNickname: string) {
    console.log(`📤 Sending audio chunk (${Math.round(audioChunk.length / 1024)} KB) to frequency: ${frequency}`);
    this.socket?.emit('audio-data', { frequency, audioChunk, senderNickname });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export default new SocketService();
