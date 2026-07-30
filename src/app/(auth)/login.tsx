import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { TextField } from '@/components/ui/text-field';
import type { ThemeColors } from '@/constants/theme';
import { Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase não configurado. Verifique o arquivo .env.local.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace('/(tabs)/inicio');
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Logo size="md" />
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Insira seus dados para continuar</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            icon="mail-outline"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />

          <TextField
            label="Senha"
            icon="lock-closed-outline"
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightPress={() => setShowPassword((v) => !v)}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Button label="Entrar" onPress={handleLogin} />
          )}
        </View>
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
    },
    top: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.xxl,
    },
    back: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    backSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
      gap: Spacing.xxxl,
    },
    header: {
      gap: Spacing.sm,
    },
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    form: {
      gap: Spacing.lg,
    },
    forgot: {
      fontSize: 13,
      color: colors.textSecondary,
      alignSelf: 'flex-start' as const,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center' as const,
    },
  };
}
