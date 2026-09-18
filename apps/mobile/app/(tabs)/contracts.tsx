import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function ContractsScreen() {
  const palette = Colors[useColorScheme()];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.kicker, { color: palette.muted }]}>APPROVAL</Text>
      <Text style={[styles.title, { color: palette.text }]}>Contracts</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        Draft envelopes sit here until you approve. Aria never sends unsigned
        paper on its own.
      </Text>
      <View
        style={[styles.card, { borderColor: palette.line, backgroundColor: palette.card }]}
      >
        <Text style={[styles.meta, { color: palette.tint }]}>PENDING APPROVAL</Text>
        <Text style={[styles.name, { color: palette.text }]}>
          No drafts in queue
        </Text>
        <Pressable
          disabled
          style={[styles.button, { backgroundColor: palette.tint, opacity: 0.45 }]}
        >
          <Text style={styles.buttonLabel}>Approve and send</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { marginTop: 8, fontSize: 32, fontWeight: '600' },
  body: { marginTop: 12, fontSize: 16, lineHeight: 24, maxWidth: 400 },
  card: { marginTop: 24, borderWidth: 1, padding: 16 },
  meta: { fontSize: 11, letterSpacing: 1.4 },
  name: { marginTop: 10, fontSize: 18, lineHeight: 24 },
  button: { marginTop: 18, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14 },
  buttonLabel: { color: '#1A1612', fontWeight: '600' },
});
