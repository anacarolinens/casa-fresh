import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import type { ThemeColors } from '@/constants/theme';
import { Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/contexts/theme-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + Spacing.xxxl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}>
      <View style={styles.hero}>
        <Logo size="lg" />
        <Text style={styles.tagline}>
          Organize sua geladeira, evite desperdícios e economize todo dia.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Começar" onPress={() => router.push('/cadastro')} />
        <Button
          label="Já tenho uma conta"
          variant="secondary"
          onPress={() => router.push('/login')}
        />
        <Pressable onPress={() => router.push('/sobre')} hitSlop={8} style={styles.about}>
          <Text style={styles.aboutText}>Sobre o app</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.xl,
      justifyContent: 'space-between' as const,
    },
    hero: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: Spacing.xxl,
    },
    tagline: {
      fontSize: 17,
      lineHeight: 26,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      maxWidth: 300,
    },
    actions: {
      gap: Spacing.md,
    },
    about: {
      alignItems: 'center' as const,
      paddingVertical: Spacing.sm,
    },
    aboutText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.accent,
    },
  };
}
