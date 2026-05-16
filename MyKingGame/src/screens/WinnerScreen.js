import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ImageBackground,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '../store/useGameStore';

const generalBackground = require('../../assets/lobyScreen.png');

/**
 * WinnerScreen - Oyunun sonunda kazananları gösterir
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation prop
 * @param {Object} props.route - Navigation route
 */
export default function WinnerScreen({ navigation, route }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const players = useGameStore((s) => s.players);
  const getRoundSummary = useGameStore((s) => s.getRoundSummary);
  const resetGame = useGameStore((s) => s.resetGame);

  // Oyuncuları skor'a göre sırala
  const sortedPlayers = [...players]
    .sort((a, b) => Number(b.score) - Number(a.score) || String(a.name).localeCompare(String(b.name)))
    .map((p, idx) => ({
      ...p,
      position: idx + 1,
    }));

  // Kazanan, 2. ve 3. sıralar
  const winner = sortedPlayers[0] || null;
  const secondPlace = sortedPlayers[1] || null;
  const thirdPlace = sortedPlayers[2] || null;
  const otherPlayers = sortedPlayers.slice(3) || [];

  const podyumHeight = screenHeight * 0.35;
  const podyum1Height = podyumHeight * 0.95;
  const podyum2Height = podyumHeight * 0.65;
  const podyum3Height = podyumHeight * 0.45;

  const handlePlayAgain = () => {
    resetGame();
    navigation.replace('Lobby');
  };

  const handleReturnToLobby = () => {
    resetGame();
    navigation.replace('Lobby');
  };

  return (
    <ImageBackground
      source={generalBackground}
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Başlık */}
          <Text style={styles.title}>KRAL BELİRLENDİ!</Text>

          {/* Kazanan Bölümü */}
          {winner && (
            <View style={styles.winnerSection}>
              <MaterialCommunityIcons
                name="crown"
                size={Math.min(screenWidth * 0.18, 90)}
                color="#FFD700"
                style={styles.crownIcon}
              />
              <Text style={[styles.winnerName, { fontSize: Math.min(screenWidth * 0.12, 56) }]}>
                {winner.name}
              </Text>
            </View>
          )}

          {/* Podyum Yapısı */}
          <View style={styles.podyumContainer}>
            {/* 2. Sırası (Sol) */}
            {secondPlace && (
              <View style={styles.podyumColumn}>
                <View style={[styles.podyumBlock, styles.podyum2, { height: podyum2Height }]}>
                  <Text style={[styles.podyumNumber, { fontSize: screenWidth * 0.12 }]}>2</Text>
                </View>
                <Text style={styles.podyumPlayerName} numberOfLines={1}>
                  {secondPlace.name}
                </Text>
                <Text style={styles.podyumScore}>{secondPlace.score}</Text>
              </View>
            )}

            {/* 1. Sırası (Ortada ve En Yüksek) */}
            {winner && (
              <View style={styles.podyumColumn}>
                <View style={[styles.podyumBlock, styles.podyum1, { height: podyum1Height }]}>
                  <Text style={[styles.podyumNumber, { fontSize: screenWidth * 0.16 }]}>1</Text>
                </View>
                <Text style={styles.podyumPlayerName} numberOfLines={1}>
                  {winner.name}
                </Text>
                <Text style={[styles.podyumScore, styles.podyumScoreWinner]}>
                  {winner.score}
                </Text>
              </View>
            )}

            {/* 3. Sırası (Sağ) */}
            {thirdPlace && (
              <View style={styles.podyumColumn}>
                <View style={[styles.podyumBlock, styles.podyum3, { height: podyum3Height }]}>
                  <Text style={[styles.podyumNumber, { fontSize: screenWidth * 0.12 }]}>3</Text>
                </View>
                <Text style={styles.podyumPlayerName} numberOfLines={1}>
                  {thirdPlace.name}
                </Text>
                <Text style={styles.podyumScore}>{thirdPlace.score}</Text>
              </View>
            )}
          </View>

          {/* Diğer Oyuncular Listesi (4+) */}
          {otherPlayers.length > 0 && (
            <View style={styles.otherPlayersSection}>
              {otherPlayers.map((player, index) => (
                <View key={`${player.name}-${index}`} style={styles.listRow}>
                  <Text style={styles.listPosition}>{player.position}.</Text>
                  <Text style={styles.listPlayerName} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <Text style={styles.listScore}>{player.score}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Aksiyon Butonları */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={handlePlayAgain}
              activeOpacity={0.85}
            >
              <Text style={styles.playAgainButtonText}>YENIDEN OYNA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.returnLobbyButton}
              onPress={handleReturnToLobby}
              activeOpacity={0.85}
            >
              <Text style={styles.returnLobbyButtonText}>LOBİYE DÖN</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFD700',
    marginBottom: 25,
    textAlign: 'center',
    letterSpacing: 2,
  },
  winnerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  crownIcon: {
    marginBottom: 10,
  },
  winnerName: {
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  podyumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 35,
    marginTop: 10,
  },
  podyumColumn: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 100,
  },
  podyumBlock: {
    width: '100%',
    backgroundColor: '#C49A2B',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podyum1: {
    backgroundColor: '#FFD700',
  },
  podyum2: {
    backgroundColor: '#C49A2B',
  },
  podyum3: {
    backgroundColor: '#B8860B',
  },
  podyumNumber: {
    color: '#1A1A1D',
    fontWeight: '900',
    textAlign: 'center',
  },
  podyumPlayerName: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },
  podyumScore: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
  podyumScoreWinner: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '800',
  },
  otherPlayersSection: {
    width: '100%',
    marginBottom: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C49A2B',
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 9,
    borderRadius: 12,
    minHeight: 45,
  },
  listPosition: {
    color: '#1A1A1D',
    fontSize: 15,
    fontWeight: '700',
    width: 35,
  },
  listPlayerName: {
    flex: 1,
    color: '#1A1A1D',
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  listScore: {
    color: '#1A1A1D',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 5,
  },
  playAgainButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  playAgainButtonText: {
    color: '#1A1A1D',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  returnLobbyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  returnLobbyButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
