import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

export default function CadastroScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCadastro = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase não configurado. Verifique o arquivo .env.local.');
      return;
    }

    if (!nome.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { nome: nome.trim() },
      },
    });

    if (authError) {
      setIsLoading(false);
      setError(authError.message);
      return;
    }

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setIsLoading(false);
        setError(signInError.message);
        return;
      }
    }

    setIsLoading(false);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Nome de Usuário"
            icon="person-outline"
            placeholder="Seu nome"
            autoComplete="name"
            value={nome}
            onChangeText={setNome}
            editable={!isLoading}
          />

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
            autoComplete="new-password"
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
            <Button label="Cadastrar" onPress={handleCadastro} />
          )}
        </View>

        <Pressable onPress={() => router.push('/login')} disabled={isLoading}>
          <Text style={styles.footer}>
            Já possui uma conta? <Text style={styles.footerLink}>Entre agora!</Text>
          </Text>
        </Pressable>
      </ScrollView>
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
      marginBottom: Spacing.xl,
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
    scroll: {
      gap: Spacing.xxl,
      paddingBottom: Spacing.xl,
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
    error: {
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center' as const,
    },
    footer: {
      textAlign: 'center' as const,
      fontSize: 14,
      color: colors.textSecondary,
    },
    footerLink: {
      color: colors.accent,
      fontWeight: '700' as const,
    },
  };
}
