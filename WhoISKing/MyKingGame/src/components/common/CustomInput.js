import { StyleSheet, TextInput, View } from 'react-native';

export default function CustomInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  editable = true,
}) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor='rgb(255, 255, 255)'
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(43, 107, 107, 0.96)',
    color: 'rgb(255, 255, 255)',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: 'KKowe',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
