import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }
> = {
  inicio: { label: 'Início', icon: 'home-outline', iconFocused: 'home' },
  estoque: { label: 'Estoque', icon: 'cube-outline', iconFocused: 'cube' },
  adicionar: { label: 'Adicionar', icon: 'add', iconFocused: 'add' },
  compras: { label: 'Compras', icon: 'cart-outline', iconFocused: 'cart' },
  mais: { label: 'Mais', icon: 'menu-outline', iconFocused: 'menu' },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            label: route.name,
            icon: 'ellipse-outline' as const,
            iconFocused: 'ellipse' as const,
          };
          const isCenter = route.name === 'adicionar';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={config.label}
                onPress={onPress}
                style={styles.centerSlot}>
                <View style={styles.fab}>
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel ?? config.label}
              onPress={onPress}
              style={styles.tab}>
              <Ionicons
                name={focused ? config.iconFocused : config.icon}
                size={22}
                color={focused ? colors.tabActive : colors.tabInactive}
              />
              <Text style={[styles.label, focused && styles.labelFocused]}>{config.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    wrapper: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    bar: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: Spacing.sm,
      paddingTop: Spacing.sm,
      minHeight: 56,
    },
    tab: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 2,
      paddingBottom: Spacing.xs,
    },
    label: {
      fontSize: 11,
      color: colors.tabInactive,
    },
    labelFocused: {
      color: colors.tabActive,
      fontWeight: '600' as const,
    },
    centerSlot: {
      flex: 1,
      alignItems: 'center' as const,
      marginTop: -28,
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: Radius.full,
      backgroundColor: colors.fab,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.accentDark,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  };
}
