import { ThemedView } from '@/components/themed-view';
import { ProgressView } from '@/components/progress-view';

export default function ProgressScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <ProgressView />
    </ThemedView>
  );
}
