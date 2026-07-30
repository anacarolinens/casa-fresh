export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  input: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  badge: string;
  tabInactive: string;
  tabActive: string;
  fab: string;
};

export const LightColors: ThemeColors = {
  background: '#F7F7F8',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8A8A8E',
  textMuted: '#AEAEB2',
  border: '#E8E8EA',
  input: '#F2F2F4',
  accent: '#F0A020',
  accentDark: '#E09010',
  accentSoft: '#FFF4E0',
  success: '#34C759',
  successSoft: '#E8F8EC',
  warning: '#F0A020',
  warningSoft: '#FFF4E0',
  danger: '#E74C3C',
  dangerSoft: '#FDECEC',
  info: '#5BB5DC',
  infoSoft: '#E8F5FB',
  badge: '#F0F0F0',
  tabInactive: '#8A8A8E',
  tabActive: '#1C1C1E',
  fab: '#F0A020',
};

export const DarkColors: ThemeColors = {
  background: '#0F0F10',
  surface: '#1C1C1E',
  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textMuted: '#6C6C70',
  border: '#2C2C2E',
  input: '#2C2C2E',
  accent: '#F0A020',
  accentDark: '#F5B040',
  accentSoft: '#3A2A12',
  success: '#30D158',
  successSoft: '#14301C',
  warning: '#F0A020',
  warningSoft: '#3A2A12',
  danger: '#FF453A',
  dangerSoft: '#3A1515',
  info: '#64D2FF',
  infoSoft: '#123038',
  badge: '#2C2C2E',
  tabInactive: '#8A8A8E',
  tabActive: '#F5F5F7',
  fab: '#F0A020',
};

/** @deprecated Prefer useTheme().colors — mantido para compatibilidade pontual */
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const LOCATIONS = ['Geladeira', 'Freezer', 'Despensa'] as const;
export const UNITS = ['Unidade', 'Kg', 'g', 'L', 'ml', 'Pacote'] as const;
export const CATEGORIES = ['Laticínios', 'Frutas', 'Verduras', 'Carnes', 'Bebidas'] as const;
