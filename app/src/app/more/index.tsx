import { router, type Href } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const ITEMS: { icon: string; title: string; description: string; href: Href }[] = [
  {
    icon: '🥣',
    title: 'Mis alimentos',
    description: 'Crea tus propios alimentos y recetas básicas',
    href: '/more/my-foods',
  },
  {
    icon: '💾',
    title: 'Copia de seguridad',
    description: 'Exporta o importa tus datos',
    href: '/more/backup',
  },
];

export default function MoreScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Card>
              <View style={styles.row}>
                <ThemedText style={styles.icon}>{item.icon}</ThemedText>
                <View style={styles.text}>
                  <ThemedText type="smallBold">{item.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.description}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">›</ThemedText>
              </View>
            </Card>
          </Pressable>
        ))}

        <Card>
          <ThemedText type="smallBold">Acerca de</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Los datos de los alimentos proceden de Open Food Facts y están bajo licencia ODbL
            (contenido bajo DbCL). Las cantidades por 100 g las aportan sus colaboradores y pueden
            contener errores.
          </ThemedText>
          <Pressable onPress={() => Linking.openURL('https://world.openfoodfacts.org')}>
            <ThemedText type="small" style={styles.link}>
              world.openfoodfacts.org
            </ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            Los objetivos calculados son estimaciones (fórmula de Mifflin-St Jeor) y no sustituyen
            el consejo de un profesional de la salud.
          </ThemedText>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { fontSize: 28, lineHeight: 34 },
  text: { flex: 1 },
  link: { color: '#3E7BFA' },
});
