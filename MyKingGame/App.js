import { NavigationContainer } from '@react-navigation/native';
import {
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts as useNunitoFonts,
} from '@expo-google-fonts/nunito';
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
  const [nunitoLoaded, nunitoError] = useNunitoFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const canRender = (fontsLoaded || !!fontError) && (nunitoLoaded || !!nunitoError);

  if (canRender && !isGlobalFontApplied) {
    if (!Text.defaultProps) {
      Text.defaultProps = {};
    }
    if (!TextInput.defaultProps) {
      TextInput.defaultProps = {};
    }
    Text.defaultProps.style = [
      { fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1.1, fontWeight: '800', fontSize: 18 },
      Text.defaultProps.style,
    ];
    TextInput.defaultProps.style = [
      { fontFamily: 'Nunito_800ExtraBold', letterSpacing: 1, fontWeight: '800', fontSize: 18 },
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
