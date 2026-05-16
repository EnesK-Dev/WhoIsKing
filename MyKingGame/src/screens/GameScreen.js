import { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import CustomButton from '../components/common/CustomButton';
import CustomInput from '../components/common/CustomInput';
import QuestionCard from '../components/game/QuestionCard';
import { useGameStore } from '../store/useGameStore';

const generalBackground = require('../../assets/lobyScreen.png');
const kingBackground = require('../../assets/kingScreen.png');
const playerLogo = require('../../assets/KralKim.png');
const kingLogo = require('../../assets/kingKralKim.png');
const crownIcon = require('../../assets/crown.png');
const SOFT_VIBRATION_MS = 18;

export default function GameScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const players = useGameStore((s) => s.players);
  const localPlayerName = useGameStore((s) => s.localPlayerName);
  const currentPlayerId = useGameStore((s) => s.currentPlayerId);
  const selfName = localPlayerName || currentPlayerId;
  const selections = useGameStore((s) => s.selections);
  const makeSelection = useGameStore((s) => s.makeSelection);
  const submitAnswer = useGameStore((s) => s.SubmitAnswer);
  const pickKingAnonymousAnswer = useGameStore((s) => s.pickKingAnonymousAnswer);
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const lastRoundSummary = useGameStore((s) => s.lastRoundSummary);
  const anonymousKingChoices = useGameStore((s) => s.anonymousKingChoices);
  const answerProgress = useGameStore((s) => s.answerProgress);
  const clearRoundSummaryFlag = useGameStore((s) => s.clearRoundSummaryFlag);
  const [textDraft, setTextDraft] = useState('');

  const me = players.find((p) => p.name === selfName || p.id === selfName);
  const kingPlayer = players.find((p) => p.isKing);
  const isCurrentPlayerKing = !!me?.isKing;
  const themeAccentColor = isCurrentPlayerKing ? '#FFD700' : '#00F5FF';

  const letters = currentQuestion?.optionLetters ?? [];
  const labels = currentQuestion?.options ?? [];
  const myLetter = selfName ? selections[selfName] : null;
  const selectedMcLabel =
    currentQuestion?.type !== 'text_input' && myLetter && letters.length
      ? labels[letters.indexOf(myLetter)] ?? null
      : null;

  const hasNonKingText =
    currentQuestion?.type === 'text_input' && !isCurrentPlayerKing
      ? selfName &&
        selections[selfName] != null &&
        String(selections[selfName]).trim() !== ''
      : false;

  const kingAnonymousPicked = selections.__kingAnonymousPick != null;

  const hasSelected =
    currentQuestion?.type === 'text_input'
      ? isCurrentPlayerKing
        ? anonymousKingChoices?.length
          ? kingAnonymousPicked
          : false
        : hasNonKingText
      : !!myLetter;

  const questionOptions =
    currentQuestion?.type === 'player_select' || currentQuestion?.type === 'standard'
      ? labels
      : [];

  useEffect(() => {
    setTextDraft('');
  }, [currentQuestion?.text, currentQuestion?.type]);

  useEffect(() => {
    if (lastRoundSummary?.fromServer) {
      navigation.replace('Scoreboard');
      clearRoundSummaryFlag();
    }
  }, [lastRoundSummary, navigation, clearRoundSummaryFlag]);

  const handleSubmitText = async () => {
    const t = textDraft.trim();
    if (!t || hasSelected || !selfName) {
      return;
    }
    makeSelection(selfName, t);
    await submitAnswer(t);
    Vibration.vibrate(SOFT_VIBRATION_MS);
  };

  const handleSelectMc = async (_item, index) => {
    if (hasSelected || !selfName || !letters[index]) {
      return;
    }
    const letter = letters[index];
    makeSelection(selfName, letter);
    await submitAnswer(letter);
    Vibration.vibrate(SOFT_VIBRATION_MS);
  };

  const renderTextInputBlock = () => {
    if (anonymousKingChoices?.length && isCurrentPlayerKing) {
      return (
        <View style={[styles.textBlock, { borderColor: themeAccentColor, shadowColor: themeAccentColor }]}>
          <Text style={styles.textQuestion}>{currentQuestion.text}</Text>
          <Text style={styles.kingPickTitle}>Kazanan sayılan metni seç (anonim):</Text>
          {anonymousKingChoices.map((line, idx) => (
            <TouchableOpacity
              key={`${idx}-${String(line).slice(0, 12)}`}
              style={[styles.kingPickRow, { borderColor: themeAccentColor }]}
              onPress={async () => {
                if (kingAnonymousPicked) {
                  return;
                }
                pickKingAnonymousAnswer(line);
                await submitAnswer(line);
                Vibration.vibrate(SOFT_VIBRATION_MS);
              }}
              activeOpacity={0.7}
              disabled={kingAnonymousPicked}
            >
              <Text style={styles.kingPickText}>{String(line)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (!isCurrentPlayerKing) {
      return (
        <View style={[styles.textBlock, { borderColor: themeAccentColor, shadowColor: themeAccentColor }]}>
          <Text style={styles.textQuestion}>{currentQuestion.text}</Text>
          <CustomInput
            value={textDraft}
            onChangeText={setTextDraft}
            placeholder="Cevabını yaz"
            maxLength={120}
            editable={!hasSelected}
          />
          <View style={styles.textSubmitWrap}>
            <CustomButton title={hasSelected ? 'Gönderildi' : 'Gönder'} onPress={handleSubmitText} />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.textBlock, { borderColor: themeAccentColor, shadowColor: themeAccentColor }]}>
        <Text style={styles.textQuestion}>{currentQuestion.text}</Text>
        <Text style={styles.waitingText}>
          Oyuncular yazıyor…
          {answerProgress
            ? ` (${answerProgress.answered} / ${answerProgress.target})`
            : ''}
        </Text>
      </View>
    );
  };

  const renderWaitingHint = () => {
    if (currentQuestion?.type === 'text_input') {
      if (!isCurrentPlayerKing) {
        return hasSelected ? (
          <Text style={styles.waitingText}>Cevabın kaydedildi, diğerleri ve kral bekleniyor…</Text>
        ) : (
          <Text style={styles.waitingText}>Cevabını yazıp Gönder.</Text>
        );
      }
      if (anonymousKingChoices?.length) {
        return kingAnonymousPicked ? (
          <Text style={styles.waitingText}>Seçimin kaydedildi…</Text>
        ) : (
          <Text style={styles.waitingText}>Listeden bir cevap seç.</Text>
        );
      }
      return null;
    }
    if (hasSelected) {
      return (
        <>
          <Image source={require('../../assets/graffiti.gif')} style={styles.waitingGif} resizeMode="contain" />
          {answerProgress ? (
            <Text style={styles.waitingText}>
              Cevaplar: {answerProgress.answered} / {answerProgress.target}
            </Text>
          ) : null}
        </>
      );
    }
    return (
      <Text style={styles.waitingText}>
        {isCurrentPlayerKing ? 'Doğru kabul ettiğin şıkkı seç .' : 'Kralın seçeceği şıkkı tahmin et.'}
      </Text>
    );
  };

  if (!currentQuestion) {
    return (
      <ImageBackground
        source={generalBackground}
        style={[styles.container, { width: screenWidth, height: screenHeight }]}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <Text style={styles.waitingText}>Soru hazırlanıyor…</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={isCurrentPlayerKing ? kingBackground : generalBackground}
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              borderColor: themeAccentColor,
              shadowColor: themeAccentColor,
            },
          ]}
        >
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Image source={isCurrentPlayerKing ? kingLogo : playerLogo} style={styles.screenLogo} resizeMode="contain" />
            <Text style={styles.roundInfo} />

            {kingPlayer ? (
              isCurrentPlayerKing ? (
                <View style={styles.kingSelfBox}>
                  <Text style={styles.kingSelfText}>KRAL SENSİN</Text>
                </View>
              ) : (
                <View style={styles.kingBox}>
                  <View style={styles.kingBoxBody}>
                    <View style={styles.kingBoxTextWrap}>
                      <Text style={styles.kingBoxCaption}>Bu turun kralı:</Text>
                      <Text style={styles.kingBoxValue}>{kingPlayer.name}</Text>
                    </View>
                    <Image source={crownIcon} style={styles.kingBoxIcon} resizeMode="contain" />
                  </View>
                </View>
              )
            ) : null}

            <View style={styles.questionArea}>
              {currentQuestion.type === 'text_input' ? (
                renderTextInputBlock()
              ) : (
                <QuestionCard
                  questionText={currentQuestion.text}
                  options={questionOptions}
                  onSelectOption={handleSelectMc}
                  selectedOption={selectedMcLabel}
                  disabled={hasSelected}
                  accentColor={themeAccentColor}
                  isKingTheme={isCurrentPlayerKing}
                />
              )}
            </View>

            {renderWaitingHint()}
          </ScrollView>
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
    width: '95%',
    maxWidth: 820,
    height: '93%',
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
    paddingBottom: 12,
    alignItems: 'center',
  },
  questionArea: {
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
  },
  screenLogo: {
    width: 260,
    height: 72,
    marginBottom: 10,
  },
  waitingText: {
    fontFamily: 'KKowe',
    color: '#D0D0D0',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 12,
    textAlign: 'center',
  },
  waitingGif: {
    width: '100%',
    height: 140,
    marginTop: 12,
  },
  roundInfo: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    textAlign: 'center',
  },
  kingBox: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#00F5FF',
    backgroundColor: '#111215',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  kingBoxBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kingBoxTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  kingBoxCaption: {
    fontFamily: 'KKowe',
    color: '#A8DCE2',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  kingBoxValue: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  kingBoxIcon: {
    width: 56,
    height: 56,
  },
  kingSelfBox: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#111215',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kingSelfText: {
    fontFamily: 'KKowe',
    color: '#FFD700',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  textBlock: {
    width: '100%',
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#00F5FF',
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  textQuestion: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 14,
    textAlign: 'center',
  },
  textSubmitWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  kingPickTitle: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  kingPickRow: {
    borderWidth: 1,
    borderColor: '#00F5FF',
    backgroundColor: '#1D1F25',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  kingPickText: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
