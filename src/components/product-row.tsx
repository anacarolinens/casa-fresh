import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import { daysBadge, statusLabel, type Product } from '@/types/product';

type ProductRowProps = {
  product: Product;
  onPress?: () => void;
  onMorePress?: () => void;
  onConsume?: () => void;
  onDiscard?: () => void;
  consumeDisabled?: boolean;
  discardDisabled?: boolean;
};

export function ProductRow({
  product,
  onPress,
  onMorePress,
  onConsume,
  onDiscard,
  consumeDisabled,
  discardDisabled,
}: ProductRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const badge = daysBadge(product);
  const alert = statusLabel(product);
  const alertColor =
    product.status === 'expired' || product.status === 'expiring'
      ? colors.danger
      : product.status === 'missing'
        ? colors.warning
        : colors.textSecondary;
  const showDiscard = product.status === 'expired' && onDiscard;

  return (
    <View style={styles.row}>
      <Pressable style={styles.main} onPress={onPress}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <View style={styles.thumb}>
            <Ionicons name="nutrition-outline" size={24} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.quantity}>
            {product.status === 'missing' ? 'Em falta' : `${product.quantity} ${product.unit}`}
          </Text>
          {alert && product.status !== 'ok' ? (
            <View style={styles.alertRow}>
              {product.status !== 'missing' ? (
                <Ionicons name="warning" size={13} color={alertColor} />
              ) : null}
              <Text style={[styles.alertText, { color: alertColor }]}>{alert}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.meta}>
          {badge ? (
            <View
              style={[
                styles.badge,
                badge.tone === 'warning' && styles.badgeWarning,
                badge.tone === 'danger' && styles.badgeDanger,
                badge.tone === 'success' && styles.badgeSuccess,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  badge.tone === 'warning' && styles.badgeTextWarning,
                  badge.tone === 'danger' && styles.badgeTextDanger,
                  badge.tone === 'success' && styles.badgeTextSuccess,
                ]}>
                {badge.text}
              </Text>
            </View>
          ) : null}
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>{product.location}</Text>
          </View>
        </View>
      </Pressable>

      {showDiscard ? (
        <Pressable
          onPress={onDiscard}
          disabled={discardDisabled}
          hitSlop={8}
          style={[styles.consumeBtn, discardDisabled && styles.consumeDisabled]}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={styles.discardText}>Descartar</Text>
        </Pressable>
      ) : onConsume && product.quantity > 0 ? (
        <Pressable
          onPress={onConsume}
          disabled={consumeDisabled}
          hitSlop={8}
          style={[styles.consumeBtn, consumeDisabled && styles.consumeDisabled]}>
          <Ionicons name="remove-circle-outline" size={22} color={colors.accentDark} />
          <Text style={styles.consumeText}>Usei 1</Text>
        </Pressable>
      ) : null}

      {onMorePress ? (
        <Pressable onPress={onMorePress} hitSlop={10} style={styles.more}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    main: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.md,
    },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: Radius.full,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    thumbImage: {
      width: 52,
      height: 52,
      borderRadius: Radius.full,
      backgroundColor: colors.input,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    quantity: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    alertRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      marginTop: 2,
    },
    alertText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    meta: {
      alignItems: 'flex-end' as const,
      gap: Spacing.xs,
    },
    badge: {
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.badge,
    },
    badgeWarning: {
      backgroundColor: colors.warningSoft,
    },
    badgeDanger: {
      backgroundColor: colors.dangerSoft,
    },
    badgeSuccess: {
      backgroundColor: colors.successSoft,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    badgeTextWarning: {
      color: colors.warning,
    },
    badgeTextDanger: {
      color: colors.danger,
    },
    badgeTextSuccess: {
      color: colors.success,
    },
    locationBadge: {
      backgroundColor: colors.badge,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    locationText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    more: {
      padding: 2,
    },
    consumeBtn: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 2,
      paddingHorizontal: Spacing.xs,
    },
    consumeDisabled: {
      opacity: 0.4,
    },
    consumeText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: colors.accentDark,
    },
    discardText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: colors.danger,
    },
  };
}
