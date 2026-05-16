import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QuestionCard({
  questionText,
  options,
  onSelectOption,
  selectedOption,
  disabled = false,
  accentColor = '#00F5FF',
  isKingTheme = false,
}) {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: accentColor,
          shadowColor: accentColor,
        },
      ]}
    >
      <Text style={styles.question}>{questionText}</Text>
      <FlatList
        data={options}
        keyExtractor={(item, index) => `${item}-${index}`}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.option,
              { borderColor: accentColor },
              selectedOption === item ? styles.optionSelected : null,
              selectedOption === item ? { borderColor: accentColor, backgroundColor: accentColor } : null,
            ]}
            onPress={() => onSelectOption?.(item, index)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text
              style={[
                styles.optionText,
                isKingTheme ? styles.optionTextKingTheme : null,
                selectedOption === item ? styles.optionTextSelected : null,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111215',
    borderWidth: 1,
    borderColor: '#00F5FF',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  question: {
    fontFamily: 'KKowe',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    borderWidth: 1,
    borderColor: '#00F5FF',
    backgroundColor: '#1D1F25',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 8,
  },
  optionText: {
    fontFamily: 'KKowe',
    color: '#D3F9FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  optionTextKingTheme: {
    color: '#FFE680',
  },
  optionSelected: {
    backgroundColor: '#00F5FF',
    borderColor: '#00F5FF',
  },
  optionTextSelected: {
    color: '#111215',
  },
});
