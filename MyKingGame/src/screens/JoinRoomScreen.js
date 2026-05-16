import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import CustomButton from '../components/common/CustomButton';
import CustomInput from '../components/common/CustomInput';
import { useGameStore } from '../store/useGameStore';

const generalBackground = require('../../assets/lobyScreen.png');

export default function JoinRoomScreen({ navigation }) {
  const joinRoom = useGameStore((s) => s.joinRoom);
  const connectionError = useGameStore((s) => s.connectionError);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isJoinDisabled = !playerName.trim() || busy;

  const handleJoin = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      setError('İsim ve oda kodu zorunlu.');
      return;
    }

    setBusy(true);
    setError('');
    const didJoin = await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    setBusy(false);

    if (!didJoin) {
      setError(connectionError || 'Katılım başarısız. Kod ve sunucu adresini kontrol edin.');
      return;
    }
    navigation.navigate('Lobby');
  };

  return (
    <ImageBackground
      source={generalBackground}
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Odaya Katıl</Text>
          <View style={styles.form}>
            <CustomInput
              value={playerName}
              onChangeText={(text) => {
                setError('');
                setPlayerName(text);
              }}
              placeholder="İsminiz"
            />
            <View style={styles.gap} />
            <CustomInput
              value={roomCode}
              onChangeText={(text) => {
                setError('');
                setRoomCode(text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 4).toUpperCase());
              }}
              placeholder="4 karakter oda kodu"
              autoCapitalize="characters"
              maxLength={4}
            />
            <View style={styles.gap} />
            <CustomButton title={busy ? 'Katılılıyor…' : 'Katıl'} onPress={handleJoin} disabled={isJoinDisabled} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    width: '70%',
    minHeight: '35%',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#00F5FF',
    padding: 20,
    backgroundColor: '#1A1A1D',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 5, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1.3,
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  gap: {
    height: 14,
  },
  errorText: {
    fontFamily: 'KKowe',
    color: '#FF9A9A',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
