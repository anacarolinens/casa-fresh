import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import type { ThemeColors } from '@/constants/theme';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme, useThemedStyles } from '@/contexts/theme-context';
import {
  getHouseholdMembers,
  getOwnProfile,
  getPendingInvites,
  getPrimaryHouseholdId,
  inviteFamilyMember,
  removeFamilyMember,
  updateOwnProfile,
  type HouseholdInvite,
  type HouseholdMember,
} from '@/lib/households';
import { pickImageSource } from '@/lib/pick-image';
import { uploadProfileAvatar } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function MaisScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { session, signOut } = useAuth();
  const userId = session?.user?.id ?? null;
  const [nome, setNome] = useState(
    () => session?.user.user_metadata?.nome || session?.user.email?.split('@')[0] || '',
  );
  const [email, setEmail] = useState(() => session?.user.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const loadFamily = useCallback(async () => {
    if (!isSupabaseConfigured || !userId || !session) {
      setMembers([]);
      setInvites([]);
      setIsLoading(false);
      return;
    }

    try {
      try {
        const profile = await getOwnProfile();
        if (profile) {
          setNome(profile.nome || '');
          setEmail(profile.email || session.user.email || '');
          setAvatarUrl(profile.avatar_url ?? null);
        } else {
          setEmail(session.user.email || '');
          setNome(session.user.user_metadata?.nome || '');
          setAvatarUrl(null);
        }
      } catch (error) {
        console.warn('Erro ao carregar perfil', error);
        setEmail(session.user.email || '');
        setNome(session.user.user_metadata?.nome || '');
      }

      setImageUri(null);
      setImageMimeType(null);
      setRemoveAvatar(false);

      const hid = await getPrimaryHouseholdId();
      setHouseholdId(hid);
      if (!hid) {
        setMembers([]);
        setInvites([]);
        return;
      }

      const [family, pending] = await Promise.all([
        getHouseholdMembers(hid),
        getPendingInvites(hid),
      ]);
      setMembers(family);
      setInvites(pending);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar família';
      Alert.alert('Erro', message);
    } finally {
      setIsLoading(false);
    }
  }, [session, userId]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const handleResetPassword = async () => {
    if (!isSupabaseConfigured || !session) {
      Alert.alert('Atenção', 'Faça login para redefinir a senha.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Atenção', 'Preencha a nova senha e a confirmação.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordReset(false);
      Alert.alert('Senha atualizada', 'Sua nova senha foi definida com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao redefinir senha';
      Alert.alert('Erro', message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!isSupabaseConfigured || !session) {
      Alert.alert('Atenção', 'Faça login para salvar o perfil.');
      return;
    }

    setIsSaving(true);
    try {
      let nextAvatarUrl: string | null | undefined;
      if (imageUri) {
        nextAvatarUrl = await uploadProfileAvatar(imageUri, imageMimeType);
      } else if (removeAvatar) {
        nextAvatarUrl = null;
      }

      await updateOwnProfile(nome, email, nextAvatarUrl);

      if (nextAvatarUrl !== undefined) {
        setAvatarUrl(nextAvatarUrl);
        setImageUri(null);
        setImageMimeType(null);
        setRemoveAvatar(false);
      }

      await loadFamily();
      Alert.alert('Salvo', 'Perfil atualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar perfil';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  const pickAvatar = () => {
    pickImageSource({
      title: 'Foto de perfil',
      canRemove: Boolean(imageUri || avatarUrl),
      onPicked: (image) => {
        setImageUri(image.uri);
        setImageMimeType(image.mimeType);
        setRemoveAvatar(false);
      },
      onRemove: () => {
        setImageUri(null);
        setImageMimeType(null);
        setRemoveAvatar(true);
      },
    });
  };

  const clearAvatar = () => {
    setImageUri(null);
    setImageMimeType(null);
    setRemoveAvatar(true);
  };

  const displayAvatarUri = removeAvatar ? null : imageUri ?? avatarUrl;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Atenção', 'Informe o e-mail do familiar.');
      return;
    }

    if (!isSupabaseConfigured || !session) {
      Alert.alert('Atenção', 'Faça login para convidar familiares.');
      return;
    }

    if (!householdId) {
      Alert.alert(
        'Atenção',
        'Não foi possível carregar a sua casa. Feche e abra o app ou verifique a ligação.',
      );
      return;
    }

    setIsSaving(true);
    try {
      await inviteFamilyMember(householdId, inviteEmail);
      setInviteEmail('');
      await loadFamily();
      Alert.alert(
        'Convite enviado',
        'Se a pessoa já tiver conta, entra na casa automaticamente. Senão, ao cadastrar com esse e-mail, o estoque é partilhado.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao convidar';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = (member: HouseholdMember) => {
    if (member.role === 'admin') return;

    Alert.alert('Remover membro', `Remover ${member.nome} da casa?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          if (!isSupabaseConfigured || !session) return;
          try {
            await removeFamilyMember(member.id);
            await loadFamily();
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao remover';
            Alert.alert('Erro', message);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Mais</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aparência</Text>
          <Pressable
            style={styles.themeRow}
            onPress={toggleDark}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}>
            <View style={styles.themeText}>
              <Text style={styles.themeLabel}>{isDark ? 'Modo claro' : 'Modo noturno'}</Text>
              <Text style={styles.themeHint}>
                {isDark ? 'Tema claro para usar de dia' : 'Tema escuro para usar à noite'}
              </Text>
            </View>
            <View style={styles.themeBtn}>
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={colors.text}
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil</Text>
          <View style={styles.card}>
            <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
              {displayAvatarUri ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(nome || email || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.avatarBtn}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>
              {displayAvatarUri ? 'Toque para alterar a foto' : 'Toque para adicionar foto'}
            </Text>
            {displayAvatarUri ? (
              <Pressable onPress={clearAvatar} hitSlop={8}>
                <Text style={styles.removeAvatar}>Remover foto</Text>
              </Pressable>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>Nome</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {isSaving ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Button label="Salvar perfil" onPress={handleSaveProfile} />
            )}

            <View style={styles.passwordDivider} />

            {showPasswordReset ? (
              <View style={styles.passwordBox}>
                <Text style={styles.passwordTitle}>Redefinir senha</Text>
                <TextField
                  label="Nova senha"
                  icon="lock-closed-outline"
                  placeholder="••••••••"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isResettingPassword}
                  rightIcon={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightPress={() => setShowNewPassword((v) => !v)}
                />
                <TextField
                  label="Confirmar nova senha"
                  icon="lock-closed-outline"
                  placeholder="••••••••"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isResettingPassword}
                  rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  onRightPress={() => setShowConfirmPassword((v) => !v)}
                />
                {isResettingPassword ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <View style={styles.passwordActions}>
                    <Button
                      label="Cancelar"
                      variant="secondary"
                      onPress={() => {
                        setShowPasswordReset(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    />
                    <Button label="Atualizar senha" onPress={handleResetPassword} />
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                style={styles.passwordLink}
                onPress={() => setShowPasswordReset(true)}
                hitSlop={8}>
                <Ionicons name="key-outline" size={18} color={colors.accent} />
                <Text style={styles.passwordLinkText}>Redefinir senha</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Família / Compartilhamento</Text>
          <Text style={styles.sectionHint}>
            Convide pessoas da família para ver e gerenciar o mesmo estoque.
          </Text>

          <View style={styles.card}>
            {isLoading && members.length === 0 ? (
              <ActivityIndicator color={colors.accent} />
            ) : null}

            {!isLoading && members.length === 0 ? (
              <Text style={styles.empty}>Nenhum membro carregado.</Text>
            ) : null}

            {members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                {member.avatar_url ? (
                  <Image
                    source={{ uri: member.avatar_url }}
                    style={styles.memberAvatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(member.nome || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.nome || 'Membro'}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {member.role === 'admin' ? 'Admin' : 'Membro'}
                  </Text>
                </View>
                {member.role !== 'admin' ? (
                  <Pressable onPress={() => handleRemove(member)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}

            {invites.length > 0 ? (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingTitle}>Convites pendentes</Text>
                {invites.map((invite) => (
                  <Text key={invite.id} style={styles.pendingEmail}>
                    {invite.email}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.inviteBox}>
              <Text style={styles.label}>Convidar por e-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="familiar@email.com"
                placeholderTextColor={colors.textMuted}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button label="Adicionar familiar" onPress={handleInvite} disabled={isSaving} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <Pressable style={styles.menuRow} onPress={() => router.push('/sobre')}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.menuRowText}>Sobre o app</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Pressable
            style={styles.logout}
            onPress={async () => {
              await signOut();
            }}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: Spacing.xl,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.xxl,
    },
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    section: {
      gap: Spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
    },
    sectionHint: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    themeRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    themeText: {
      flex: 1,
      gap: 2,
    },
    themeLabel: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    themeHint: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    themeBtn: {
      width: 44,
      height: 44,
      borderRadius: Radius.full,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    avatarWrap: {
      alignSelf: 'center' as const,
      position: 'relative' as const,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.accentSoft,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarBtn: {
      position: 'absolute' as const,
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    avatarHint: {
      textAlign: 'center' as const,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: -Spacing.sm,
    },
    removeAvatar: {
      textAlign: 'center' as const,
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.danger,
      marginTop: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: colors.accent,
    },
    field: {
      gap: Spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.input,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    passwordDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      marginTop: Spacing.xs,
    },
    passwordBox: {
      gap: Spacing.md,
      paddingTop: Spacing.sm,
    },
    passwordTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    passwordActions: {
      gap: Spacing.sm,
    },
    passwordLink: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    passwordLinkText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.accent,
    },
    memberRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.md,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    memberAvatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    memberAvatarText: {
      fontWeight: '700' as const,
      color: colors.text,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    memberEmail: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    roleBadge: {
      backgroundColor: colors.badge,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    roleText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600' as const,
    },
    pendingBox: {
      gap: Spacing.xs,
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    pendingTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
    pendingEmail: {
      fontSize: 13,
      color: colors.accentDark,
    },
    inviteBox: {
      gap: Spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: Spacing.lg,
    },
    empty: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center' as const,
    },
    logout: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.danger,
    },
    menuRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
    },
    menuRowText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
  };
}
