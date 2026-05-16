import { useEffect } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import CustomButton from '../components/common/CustomButton';
import PlayerBadge from '../components/game/PlayerBadge';
import { useGameStore } from '../store/useGameStore';

const generalBackground = require('../../assets/lobyScreen.png');

export default function LobbyScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const roomId = useGameStore((s) => s.roomId);
  const localPlayerName = useGameStore((s) => s.localPlayerName);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const players = useGameStore((s) => s.players);
  const startGameOnServer = useGameStore((s) => s.startGameOnServer);
  const gameState = useGameStore((s) => s.gameState);
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const connectionError = useGameStore((s) => s.connectionError);

  const selfName = localPlayerName || currentPlayerId;
  const me = players.find((p) => p.name === selfName || p.id === selfName);
  const isHost = !!me?.isHost;

  useEffect(() => {
    if (gameState === 'playing' && currentQuestion) {
      navigation.navigate('Game');
    }
  }, [gameState, currentQuestion, navigation]);

  const handleStart = async () => {
    const ok = await startGameOnServer();
    if (ok) {
      navigation.navigate('Game');
    }
  };

  return (
    <ImageBackground
      source={generalBackground}
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.roomCode}>ODA KODU: {roomId}</Text>
          {connectionError ? <Text style={styles.errorText}>{connectionError}</Text> : null}
          <Text style={styles.sectionTitle}>Oyuncular</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {players.map((p) => (
              <PlayerBadge key={String(p.id)} name={p.name} score={p.score} isKing={p.isKing} />
            ))}
          </ScrollView>
          {isHost ? (
            <CustomButton title="Oyunu Başlat" onPress={handleStart} />
          ) : (
            <Text style={styles.waitingText}>Oda sahibinin oyunu başlatması bekleniyor…</Text>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '75%',
    height: '70%',
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#1A1A1D',
    borderWidth: 3,
    borderColor: '#00F5FF',
    opacity: 0.95,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 5, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  roomCode: {
    color: '#FFFFFF',
    fontSize: 30,
    letterSpacing: 1,
    marginBottom: 18,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#D3F9FF',
    fontSize: 18,
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 8,
  },
  waitingText: {
    color: '#D0D0D0',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 12,
  },
  errorText: {
    color: '#FF9A9A',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
});
