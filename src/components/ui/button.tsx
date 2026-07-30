import { Pressable, type PressableProps, Text } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/contexts/theme-context';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ label, variant = 'primary', style, disabled, ...props }: ButtonProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      disabled={disabled}
      style={(state) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'ghost' && styles.labelGhost,
          variant === 'danger' && styles.labelDanger,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    base: {
      borderRadius: Radius.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 52,
    },
    primary: {
      backgroundColor: colors.accent,
    },
    secondary: {
      backgroundColor: colors.input,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.danger,
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    labelPrimary: {
      color: '#FFFFFF',
    },
    labelSecondary: {
      color: colors.text,
    },
    labelGhost: {
      color: colors.accent,
    },
    labelDanger: {
      color: '#FFFFFF',
    },
  };
}
