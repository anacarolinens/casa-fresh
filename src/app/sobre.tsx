import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/logo';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';

const FEATURES = [
  {
    icon: 'cube-outline' as const,
    title: 'Estoque partilhado',
    text: 'Registe alimentos com quantidade, local e validade para toda a família ver.',
  },
  {
    icon: 'cart-outline' as const,
    title: 'Lista de compras',
    text: 'Monte a lista do supermercado e marque o que já comprou.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Alertas',
    text: 'Receba avisos de produtos vencidos, a vencer ou em falta.',
  },
  {
    icon: 'people-outline' as const,
    title: 'Família',
    text: 'Convide membros por e-mail e gerenciem a mesma casa juntos.',
  },
];

const TECH = ['React Native', 'Expo', 'TypeScript', 'Supabase'];

export default function SobreScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
      ]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sobre o app</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Logo size="sm" />
          <Text style={styles.appName}>CasaFresh</Text>
          <Text style={styles.version}>Versão {version}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.lead}>
            O CasaFresh ajuda a sua família a organizar os alimentos de casa: o que tem no estoque,
            o que está a vencer e o que falta comprar.
          </Text>
          <Text style={styles.body}>
            Feito para o dia a dia, com partilha entre membros da mesma casa, fotos dos produtos e
            modo escuro para usar à noite.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que pode fazer</Text>
          <View style={styles.card}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={20} color={colors.accent} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureBody}>{feature.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tecnologias</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              App mobile com React Native e Expo. Os dados, login e fotos ficam no Supabase — uma
              plataforma na nuvem com base de dados PostgreSQL, autenticação e armazenamento de
              ficheiros.
            </Text>
            <View style={styles.tags}>
              {TECH.map((item) => (
                <View key={item} style={styles.tag}>
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.credit}>Desenvolvido com ♥ por Ana</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: Spacing.xl,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: Spacing.lg,
    },
    back: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    content: {
      gap: Spacing.xxl,
      paddingBottom: Spacing.xxxl,
    },
    hero: {
      alignItems: 'center' as const,
      gap: Spacing.sm,
    },
    appName: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: colors.text,
    },
    version: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    section: {
      gap: Spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    lead: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
      color: colors.text,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    featureRow: {
      flexDirection: 'row' as const,
      gap: Spacing.md,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    featureText: {
      flex: 1,
      gap: 2,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    featureBody: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    tags: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: Spacing.sm,
    },
    tag: {
      backgroundColor: colors.input,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    tagText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    credit: {
      textAlign: 'center' as const,
      fontSize: 13,
      color: colors.textMuted,
    },
  };
}
