import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';

type TextFieldProps = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
};

export function TextField({
  label,
  icon,
  rightIcon,
  onRightPress,
  style,
  ...props
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.leftIcon} /> : null}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon, rightIcon && styles.inputWithRight, style]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
        {rightIcon ? (
          <Pressable onPress={onRightPress} style={styles.rightIcon} hitSlop={8}>
            <Ionicons name={rightIcon} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    wrap: {
      gap: Spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    inputWrap: {
      position: 'relative' as const,
      justifyContent: 'center' as const,
    },
    input: {
      backgroundColor: colors.input,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md + 2,
      fontSize: 16,
      color: colors.text,
    },
    inputWithIcon: {
      paddingLeft: 44,
    },
    inputWithRight: {
      paddingRight: 44,
    },
    leftIcon: {
      position: 'absolute' as const,
      left: Spacing.lg,
      zIndex: 1,
    },
    rightIcon: {
      position: 'absolute' as const,
      right: Spacing.lg,
      zIndex: 1,
    },
  };
}
