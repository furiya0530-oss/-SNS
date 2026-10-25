// 上司キャラの吹き出し
import { StyleSheet, Text, View } from 'react-native';
import { BOSS_NAME } from '../lib/boss';
import { colors, space } from '../lib/theme';

export function BossBubble({ text }: { text: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 26 }}>👔</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.name}>{BOSS_NAME}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3EAF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: space * 0.75,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  name: { fontSize: 12, color: colors.sub, marginBottom: 2 },
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
