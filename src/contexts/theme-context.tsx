import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  DarkColors,
  LightColors,
  type ThemeColors,
  type ThemeMode,
} from '@/constants/theme';

const STORAGE_KEY = '@casafresh/theme-mode';

type ThemePreference = ThemeMode | 'system';

type ThemeContextType = {
  preference: ThemePreference;
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (value: ThemePreference) => void;
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
  }, []);

  const mode: ThemeMode =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const colors = mode === 'dark' ? DarkColors : LightColors;

  const toggleDark = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  const value = useMemo(
    () => ({
      preference,
      mode,
      colors,
      isDark: mode === 'dark',
      setPreference,
      toggleDark,
    }),
    [preference, mode, colors, setPreference, toggleDark],
  );

  // Evita flash: até carregar preferência, usa tema claro
  if (!ready) {
    const bootValue: ThemeContextType = {
      preference: 'light',
      mode: 'light',
      colors: LightColors,
      isDark: false,
      setPreference,
      toggleDark,
    };
    return <ThemeContext.Provider value={bootValue}>{children}</ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return ctx;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
