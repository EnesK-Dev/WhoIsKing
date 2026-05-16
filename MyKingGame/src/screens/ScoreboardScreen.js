import { Image, ImageBackground, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import CustomButton from '../components/common/CustomButton';
import { useGameStore, WIN_SCORE_THRESHOLD } from '../store/useGameStore';

const generalBackground = require('../../assets/lobyScreen.png');
const crownIcon = require('../../assets/crown.png');

export default function ScoreboardScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const players = useGameStore((s) => s.players);
  const gameState = useGameStore((s) => s.gameState);
  const nextRound = useGameStore((s) => s.nextRound);
  const setGameState = useGameStore((s) => s.setGameState);
  const getRoundSummary = useGameStore((s) => s.getRoundSummary);

  const summary = getRoundSummary();
  const sortedEntries = [...summary.entries].sort(
    (a, b) =>
      b.pointsEarned - a.pointsEarned || String(a.name).localeCompare(String(b.name))
  );

  const isFinishingGame =
    gameState === 'game_over' || players.some((p) => Number(p.score) > WIN_SCORE_THRESHOLD);

  const handleNextQuestion = async () => {
    const before = useGameStore.getState();
    if (before.gameState === 'game_over') {
      await nextRound();
      setGameState('waiting');
      navigation.replace('Lobby');
      return;
    }
    await nextRound();
    navigation.replace('Game');
  };

  return (
    <ImageBackground
      source={generalBackground}
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Skor Tablosu</Text>
            {summary.questionText ? <Text style={styles.roundMeta}>{summary.questionText}</Text> : null}

            <View style={styles.kingBox}>
              <View style={styles.kingBoxBody}>
                <View style={styles.kingBoxTextWrap}>
                  {summary.kingAnswerCaption ? (
                    <Text style={styles.kingBoxCaption}>{summary.kingAnswerCaption}</Text>
                  ) : null}
                  <Text style={styles.kingBoxLabel}>Kralın Cevabı:</Text>
                  <Text style={styles.kingBoxValue}>{summary.kingAnswerHeadline}</Text>
                </View>
                <View style={styles.kingBoxIconWrap}>
                  <Image source={crownIcon} style={styles.crownIcon} resizeMode="contain" />
                </View>
              </View>
            </View>

            <Text style={styles.subsectionLabel}>Oyuncular :</Text>
            {sortedEntries.map((row) => (
              <View key={String(row.playerId)} style={styles.answerRow}>
                <View style={styles.answerRowMain}>
                  <Text style={styles.answerLine}>
                    <Text style={styles.answerName}>{row.name}</Text>
                    {row.isKing ? <Text style={styles.kingTag}> (Kral)</Text> : null}
                    {!row.isKing ? <Text style={styles.answerSep}>: </Text> : null}
                    {!row.isKing ? <Text style={styles.answerChoice}>{row.choiceLabel}</Text> : null}
                  </Text>
                </View>
                {row.pointsEarned > 0 ? (
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsBadgeText}>+{row.pointsEarned} Puan</Text>
                  </View>
                ) : (
                  <Text style={styles.pointsZero}>0 Puan</Text>
                )}
              </View>
            ))}

          </ScrollView>
          <View style={styles.buttonWrap}>
            <CustomButton
              title={
                isFinishingGame ? 'Sıradaki soruya geç (oyun biter)' : 'Sıradaki soruya geç'
              }
              onPress={handleNextQuestion}
            />
          </View>
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
    width: '82%',
    maxWidth: 880,
    height: '80%',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
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
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  subsectionLabel: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  roundMeta: {
    fontFamily: 'KKowe',
    color: '#C8E7EB',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  kingBox: {
    borderWidth: 2,
    borderColor: '#00F5FF',
    backgroundColor: '#111215',
    paddingHorizontal:10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  kingBoxBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
  },
  kingBoxTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  kingBoxIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownIcon: {
    width: 100,
    height: 100,
  },
  kingBoxLabel: {
    fontFamily: 'KKowe',
    color: '#A8DCE2',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom:1,
    marginTop:25,
  },
  kingBoxValue: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginTop:1,
  },
  kingBoxCaption: {
    fontFamily: 'KKowe',
    color: '#C8E7EB',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop:3,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#00F5FF',
    backgroundColor: '#111215',
    borderRadius: 10,
  },
  answerRowMain: {
    flex: 1,
    minWidth: 0,
  },
  answerLine: {
    fontFamily: 'KKowe',
    flexWrap: 'wrap',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  answerName: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  kingTag: {
    fontFamily: 'KKowe',
    color: '#FFD700',
    fontWeight: '800',
    letterSpacing: 1,
  },
  answerSep: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  answerChoice: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  pointsBadge: {
    backgroundColor: '#00F5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pointsBadgeText: {
    fontFamily: 'KKowe',
    color: '#111215',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pointsZero: {
    fontFamily: 'KKowe',
    color: '#A8DCE2',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    alignSelf: 'center',
  },
  buttonWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2C31',
    alignItems: 'center',
  },
});
