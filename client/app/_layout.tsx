import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { View } from 'react-native';

export default function Layout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, backgroundColor: '#121212' }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1E1E1E',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#121212',
            },
          }}
        />
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}
