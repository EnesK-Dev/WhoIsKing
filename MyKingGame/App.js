import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import signalRService from './src/services/signalRService';
import { useGameStore } from './src/store/useGameStore';

let isGlobalFontApplied = false;



export default function App() {
  const initializeSignalR = useGameStore((s) => s.initializeSignalR);
  const fetchQuestionsCatalog = useGameStore((s) => s.fetchQuestionsCatalog);
  const [fontsLoaded, fontError] = useFonts({
    KKowe: require('./assets/font/KKowe.ttf'),
    GraffitiCity: require('./assets/font/Graffiti City.otf'),
  });

  const canRender = fontsLoaded || !!fontError;

  if (canRender && !isGlobalFontApplied) {
    if (!Text.defaultProps) {
      Text.defaultProps = {};
    }
    if (!TextInput.defaultProps) {
      TextInput.defaultProps = {};
    }
    Text.defaultProps.style = [
      { fontFamily: 'KKowe', letterSpacing: 1.1, fontWeight: '800', fontSize: 18 },
      Text.defaultProps.style,
    ];
    TextInput.defaultProps.style = [
      { fontFamily: 'KKowe', letterSpacing: 1, fontWeight: '800', fontSize: 18 },
      TextInput.defaultProps.style,
    ];
    isGlobalFontApplied = true;
  }

  useEffect(() => {
    if (!canRender) {
      return undefined;
    }

    initializeSignalR().catch((error) => {
      console.log('[App] SignalR initialization failed:', error?.message ?? error);
    });

    fetchQuestionsCatalog().catch(() => {});

    return () => {
      signalRService.stopConnection().catch((error) => {
        console.log('[App] SignalR stop failed:', error?.message ?? error);
      });
    };
  }, [canRender, initializeSignalR, fetchQuestionsCatalog]);

  if (!canRender) {
    return null;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}
