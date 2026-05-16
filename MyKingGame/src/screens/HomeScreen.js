import { useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import CustomButton from '../components/common/CustomButton';
import CustomInput from '../components/common/CustomInput';
import { useGameStore } from '../store/useGameStore';

const generalBackground = require('../../assets/homeScreen.png');
const graffitiGif = require('../../assets/graffiti.gif');

export default function HomeScreen({ navigation }) {
  const createRoom = useGameStore((s) => s.createRoom);
  const connectionError = useGameStore((s) => s.connectionError);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Oda kurmak için önce isminizi girin.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const roomCode = await createRoom(playerName.trim());
      if (!roomCode) {
        setError(connectionError || 'Oda oluşturulamadı. Sunucu adresini ve SignalR bağlantısını kontrol edin.');
        return;
      }
      navigation.navigate('Lobby');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ImageBackground
      source={generalBackground}
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.buttons}>
            <CustomInput
              value={playerName}
              onChangeText={(text) => {
                setError('');
                setPlayerName(text);
              }}
              placeholder="İsminiz"
            />
            <Image source={graffitiGif} style={styles.graffitiGif} resizeMode="contain" />
            <View style={styles.inputGap} />
            <CustomButton
              style={styles.uPbutton}
              title={busy ? 'Kuruluyor…' : 'Oda Kur'}
              onPress={handleCreateRoom}
              disabled={busy}
            />
            <View style={styles.gap} />
            <CustomButton
              style={styles.downButton}
              title="Odaya Katıl"
              onPress={() => navigation.navigate('JoinRoom')}
            />
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
  panel: {
    width: '70%',
    height: '40%',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1D',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
    borderWidth: 3,
    borderColor: '#00F5FF',
    shadowRadius: 10,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 5, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 80,
  },
  uPbutton: {
    width: '90%',
  },
  downButton: {
    width: '90%',
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
  },
  graffitiGif: {
    width: 100,
    height: 100,
    marginBottom: 1,
  },

  gap: {
    height: 16,
  },
  inputGap: {
    height: 14,
  },
  errorText: {
    fontFamily: 'KKowe',
    color: '#00F5FF',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
