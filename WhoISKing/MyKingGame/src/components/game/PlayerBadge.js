import { StyleSheet, Text, View } from 'react-native';

export default function PlayerBadge({ name, score, isKing }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.name}>
        {name}
        {isKing ? ' (Kral)' : ''}
      </Text>
      <Text style={styles.score}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'KKowe',
    color: '#000000',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1,
  },
  score: {
    fontFamily: 'KKowe',
    color: '#333333',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
