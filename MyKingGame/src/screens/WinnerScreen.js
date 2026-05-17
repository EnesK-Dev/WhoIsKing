import React from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ImageBackground,
} from 'react-native';
import CustomButton from '../components/common/CustomButton';
import { useGameStore } from '../store/useGameStore';

const generalBackground = require('../../assets/winnerScreen.png');
const crownImage = require('../../assets/crown.png');

/**
 * WinnerScreen - Oyunun sonunda kazananları gösterir
 * @param {Object} props - Component props
 * @param {Object} props.navigation - React Navigation prop
 */
export default function WinnerScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const players = useGameStore((s) => s.players);
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

  const handleReturnToLobby = () => {
    resetGame();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Lobby' }],
    });
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
              <Image
                source={crownImage}
                style={styles.crownIcon}
                resizeMode="contain"
              />
              <Text style={[styles.winnerName, { fontSize: Math.min(screenWidth * 0.12, 56) }]}>
                {winner.name}
              </Text>
            </View>
          )}

          {/* Podyum Yapısı */}
          <View style={styles.podyumContainer}>
            <View style={styles.podyumSideSlot}>
              {secondPlace && (
                <View style={[styles.podyumColumn, styles.podyumLeftColumn]}>
                  <Text
                    style={[styles.podyumPlayerName, styles.podyumPlayerNameSecond]}
                    numberOfLines={1}
                  >
                    {secondPlace.name}
                  </Text>
                  <View style={[styles.podyumBlock, styles.podyum2, { height: podyum2Height }]}>
                    <Text style={[styles.podyumNumber, { fontSize: screenWidth * 0.12 }]}>2</Text>
                  </View>
                  <Text style={[styles.podyumScore, styles.podyumScoreSecond]}>{secondPlace.score}</Text>
                </View>
              )}
            </View>

            <View style={styles.podyumCenterSlot}>
              {winner && (
                <View style={styles.podyumColumn}>
                  <View style={[styles.podyumBlock, styles.podyum1, { height: podyum1Height }]}>
                    <Text style={[styles.podyumNumber, { fontSize: screenWidth * 0.16 }]}>1</Text>
                  </View>
                  <Text style={[styles.podyumScore, styles.podyumScoreWinner]}>{winner.score}</Text>
                </View>
              )}
            </View>

            <View style={styles.podyumSideSlot}>
              {thirdPlace && (
                <View style={[styles.podyumColumn, styles.podyumRightColumn]}>
                  <Text
                    style={[styles.podyumPlayerName, styles.podyumPlayerNameThird]}
                    numberOfLines={1}
                  >
                    {thirdPlace.name}
                  </Text>
                  <View style={[styles.podyumBlock, styles.podyum3, { height: podyum3Height }]}>
                    <Text style={[styles.podyumNumber, { fontSize: screenWidth * 0.12 }]}>3</Text>
                  </View>
                  <Text style={[styles.podyumScore, styles.podyumScoreThird]}>{thirdPlace.score}</Text>
                </View>
              )}
            </View>
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
            <CustomButton
              style={styles.returnLobbyButton}
              textStyle={styles.returnLobbyButtonText}
              onPress={handleReturnToLobby}
              title="LOBİYE DÖN"
            />
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop:40,
    flex: 1,
    backgroundColor: '#121212',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#1A1A1D',
    margin:50,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00F5FF',
    overflow: 'hidden',
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
    marginBottom: 12,
  },
  crownIcon: {
    marginBottom: 10,
    width: 110,
    height: 110,
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
    marginBottom: 35,
    marginTop: 0,
  },
  podyumSideSlot: {
    flex: 1,
    minWidth: 0,
  },
  podyumCenterSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  podyumColumn: {
    alignItems: 'center',
    maxWidth: 170,
  },
  podyumLeftColumn: {
    alignSelf: 'flex-end',
  },
  podyumRightColumn: {
    alignSelf: 'flex-start',
  },
  podyumBlock: {
    width: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  podyum1: {
    backgroundColor: '#FFD700',
  },
  podyum2: {
    backgroundColor: '#BF00FF',
  },
  podyum3: {
    backgroundColor: '#00F5FF',
  },
  podyumNumber: {
    color: '#1A1A1D',
    fontWeight: '900',
    textAlign: 'center',
  },
  podyumPlayerName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },
  podyumPlayerNameSecond: {
    color: '#BF00FF',
  },
  podyumPlayerNameThird: {
    color: '#00F5FF',
  },
  podyumScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  podyumScoreSecond: {
    color: '#BF00FF',
  },
  podyumScoreThird: {
    color: '#00F5FF',
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
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#00F5FF',
    backgroundColor: '#111215',
    borderRadius: 10,
    minHeight: 45,
  },
  listPosition: {
    color: '#FFFFFF',
    fontFamily: 'KKowe',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    width: 40,
  },
  listPlayerName: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'KKowe',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginHorizontal: 10,
  },
  listScore: {
    color: '#D3F9FF',
    fontFamily: 'KKowe',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 5,
  },
  returnLobbyButton: {
    width: '100%',
    backgroundColor: '#1A1A1D',
    borderWidth: 2.5,
    borderColor: '#00F5FF',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  returnLobbyButtonText: {
    color: '#00F5FF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
