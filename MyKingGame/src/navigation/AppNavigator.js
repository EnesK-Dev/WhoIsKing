import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameScreen from '../screens/GameScreen';
import HomeScreen from '../screens/HomeScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import LobbyScreen from '../screens/LobbyScreen';
import ScoreboardScreen from '../screens/ScoreboardScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Kral Kim?' }} />
      <Stack.Screen
        name="JoinRoom"
        component={JoinRoomScreen}
        options={{ title: 'Odaya Katıl' }}
      />
      <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: 'Lobi' }} />
      <Stack.Screen name="Game" component={GameScreen} options={{ title: 'Oyun' }} />
      <Stack.Screen
        name="Scoreboard"
        component={ScoreboardScreen}
        options={{ title: 'Skor Tablosu' }}
      />
    </Stack.Navigator>
  );
}
