# Walky Takly

A real-time internet-based walkie-talkie app built with Expo and Socket.io.

## Features
- **Global Communication**: Talk to anyone on the same frequency anywhere in the world.
- **Push-to-Talk (PTT)**: Industrial-grade interface for instant voice transmission.
- **Dynamic Frequencies**: Create your own channel or join existing ones.
- **Presence Tracking**: See who else is online in your channel.
- **Dark Mode UI**: Clean, premium aesthetic optimized for low-light use.

## Prerequisites
- Node.js (v18 or higher)
- Expo Go app on your phone (for testing)

## Installation & Setup

### 1. Clone/Setup the project
Ensure you have the folder structure:
```
/walk-talk
  /client
  /server
```

### 2. Setup the Backend
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:3000`. 
*Note: To test on a physical device, find your computer's local IP (e.g., 192.168.1.XX) and update it in `client/src/services/socket.ts`.*

### 3. Setup the Frontend
```bash
cd client
npm install
npx expo start
```
Scan the QR code with your Expo Go app (Android) or Camera app (iOS).

## Important Files
- `client/app/room/[id].tsx`: Main walkie-talkie logic and UI.
- `client/src/hooks/useAudio.ts`: Audio recording/playback service.
- `client/src/services/socket.ts`: Real-time communication bridge.
- `server/index.js`: Socket.io event handling and broadcasting.

## Required Packages (already in package.json)
- `expo-av`: For audio recording and playback.
- `socket.io-client`: For real-time socket communication.
- `expo-router`: For file-based navigation.
- `lucide-react-native`: For premium iconography.
- `expo-secure-store`: For persistent user data.
