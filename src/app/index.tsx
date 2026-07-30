import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/sobre')}
          hitSlop={12}
          style={styles.chromeBtn}
          accessibilityLabel="Sobre o app"
          accessibilityRole="button">
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={toggleDark}
          hitSlop={12}
          style={styles.chromeBtn}
          accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          accessibilityRole="button">
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.text}
          />
        </Pressable>
      </View>

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
    topBar: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    chromeBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
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
  };
}
