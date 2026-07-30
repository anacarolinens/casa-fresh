import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ProductsProvider } from '@/contexts/products-context';
import { ShoppingProvider } from '@/contexts/shopping-context';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { Colors, Spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.hideAsync().catch(() => {});

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Erro ao abrir o app</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <Pressable style={styles.errorBtn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.errorBtnText}>Tentar de novo</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function AuthGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !pathname) return;

    const inTabs = pathname.startsWith('/inicio')
      || pathname.startsWith('/estoque')
      || pathname.startsWith('/adicionar')
      || pathname.startsWith('/compras')
      || pathname.startsWith('/mais')
      || pathname.includes('(tabs)');

    const inAuth = pathname === '/login' || pathname === '/cadastro';
    const inWelcome = pathname === '/' || pathname === '';

    if (!session && inTabs) {
      router.replace('/');
      return;
    }

    if (session && (inAuth || inWelcome)) {
      router.replace('/(tabs)/inicio');
    }
  }, [session, pathname, router]);

  return <>{children}</>;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <ProductsProvider>
              <ShoppingProvider>
                <AuthGate>
                  <ThemedStatusBar />
                  <Stack screenOptions={{ headerShown: false }} />
                </AuthGate>
              </ShoppingProvider>
            </ProductsProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.danger,
  },
  errorBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
