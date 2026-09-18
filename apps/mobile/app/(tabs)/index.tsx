import { Appearance, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function DeskScreen() {
  const scheme = useColorScheme();
  const palette = Colors[scheme];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.kicker, { color: palette.muted }]}>ARIA DESK</Text>
      <Text style={[styles.title, { color: palette.text }]}>
        Qualify first. Paper later.
      </Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        New leads are texted in under twenty seconds. Contracts wait here until
        you tap once.
      </Text>

      <View style={styles.stats}>
        <Stat label="SLA" value="20s" palette={palette} />
        <Stat label="Queue" value="—" palette={palette} />
        <Stat label="Mode" value={scheme} palette={palette} />
      </View>

      <Pressable
        onPress={() => Appearance.setColorScheme(scheme === 'dark' ? 'light' : 'dark')}
        style={({ pressed }) => [
          styles.toggle,
          {
            borderColor: palette.line,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.toggleLabel, { color: palette.text }]}>
          {scheme === 'dark' ? 'Switch to day desk' : 'Switch to night desk'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: (typeof Colors)['dark'];
}) {
  return (
    <View style={[styles.stat, { borderColor: palette.line }]}>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '600',
  },
  body: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 360,
  },
  stats: {
    marginTop: 28,
    gap: 10,
  },
  stat: {
    borderWidth: 1,
    padding: 14,
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '600',
  },
  toggle: {
    marginTop: 28,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  toggleLabel: {
    fontSize: 14,
  },
});
