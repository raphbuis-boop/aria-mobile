import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const PLACEHOLDER = [
  { name: 'Waiting on first webhook', source: 'Meta / Zillow / Realtor', status: 'idle' },
];

export default function LeadsScreen() {
  const palette = Colors[useColorScheme()];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.kicker, { color: palette.muted }]}>PIPELINE</Text>
      <Text style={[styles.title, { color: palette.text }]}>Leads</Text>
      <View style={{ marginTop: 20, gap: 10 }}>
        {PLACEHOLDER.map((lead) => (
          <View
            key={lead.name}
            style={[styles.card, { borderColor: palette.line, backgroundColor: palette.card }]}
          >
            <Text style={[styles.name, { color: palette.text }]}>{lead.name}</Text>
            <Text style={[styles.meta, { color: palette.muted }]}>
              {lead.source} · {lead.status}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },
  title: { marginTop: 8, fontSize: 32, fontWeight: '600' },
  card: { borderWidth: 1, padding: 16 },
  name: { fontSize: 17, fontWeight: '600' },
  meta: { marginTop: 6, fontSize: 13 },
});
