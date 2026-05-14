import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import socketService from '../src/services/socket';

export default function EntryPoint() {
  const router = useRouter();

  useEffect(() => {
    handleAutoLogin();
  }, []);

  const handleAutoLogin = async () => {
    try {
      // 1. Initialize Socket immediately
      socketService.getSocket();

      // 2. Check for existing nickname
      let nickname = await SecureStore.getItemAsync('nickname');

      // 3. If no nickname, generate a Guest ID
      if (!nickname) {
        nickname = `Guest-${Math.floor(Math.random() * 1000)}`;
        await SecureStore.setItemAsync('nickname', nickname);
      }

      // 4. Redirect to Home instantly
      router.replace('/home');
    } catch (e) {
      console.error('Login Error:', e);
      router.replace('/home');
    }
  };

  return null; // No UI, completely silent entry
}
