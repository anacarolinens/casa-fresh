import { supabase } from '@/lib/supabase';

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

export type HouseholdInvite = {
  id: string;
  household_id: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
};

let cachedHouseholdId: string | null = null;
let cachedHouseholdUserId: string | null = null;
let syncedInvitesUserId: string | null = null;
let profileAvatarSupported: boolean | null = null;
/** Nome do perfil já carregado/salvo — evita flash do metadata antigo no Início */
let cachedDisplayName: { userId: string; nome: string } | null = null;

function isMissingAvatarColumn(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('avatar_url')
    && (message.includes('does not exist')
      || message.includes('could not find')
      || message.includes('schema cache'))
  );
}

async function fetchProfilesByIds(userIds: string[]) {
  if (!userIds.length) return [];

  if (profileAvatarSupported !== false) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, avatar_url')
      .in('id', userIds);

    if (!error) {
      profileAvatarSupported = true;
      return data ?? [];
    }

    if (isMissingAvatarColumn(error)) {
      profileAvatarSupported = false;
    } else {
      throw error;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email')
    .in('id', userIds);

  if (error) throw error;
  return (data ?? []).map((profile) => ({ ...profile, avatar_url: null }));
}

export function clearHouseholdCache() {
  cachedHouseholdId = null;
  cachedHouseholdUserId = null;
  syncedInvitesUserId = null;
  cachedDisplayName = null;
}

/** Restaura o household conhecido (ex.: cache em disco) para evitar query extra. */
export function seedHouseholdCache(userId: string, householdId: string | null) {
  cachedHouseholdUserId = userId;
  cachedHouseholdId = householdId;
}

export function getCachedDisplayName(userId?: string | null) {
  if (!userId || !cachedDisplayName || cachedDisplayName.userId !== userId) return null;
  return cachedDisplayName.nome;
}

export function setCachedDisplayName(userId: string, nome: string) {
  cachedDisplayName = { userId, nome: nome.trim() };
}

export async function getPrimaryHouseholdId(forUserId?: string) {
  if (forUserId && cachedHouseholdUserId === forUserId && cachedHouseholdId) {
    return cachedHouseholdId;
  }

  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  if (!user) return null;

  if (cachedHouseholdUserId === user.id && cachedHouseholdId) {
    return cachedHouseholdId;
  }

  const { data: memberships, error } = await supabase
    .from('household_members')
    .select('household_id, role, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!memberships?.length) return null;

  let householdId = memberships[0].household_id;

  if (memberships.length > 1) {
    const householdIds = memberships.map((m) => m.household_id);

    const [{ data: products }, { data: allMembers }] = await Promise.all([
      supabase.from('products').select('household_id').in('household_id', householdIds),
      supabase.from('household_members').select('household_id').in('household_id', householdIds),
    ]);

    const productCount = new Map<string, number>();
    const memberCount = new Map<string, number>();
    for (const id of householdIds) {
      productCount.set(id, 0);
      memberCount.set(id, 0);
    }
    for (const row of products ?? []) {
      productCount.set(row.household_id, (productCount.get(row.household_id) ?? 0) + 1);
    }
    for (const row of allMembers ?? []) {
      memberCount.set(row.household_id, (memberCount.get(row.household_id) ?? 0) + 1);
    }

    const scored = memberships.map((m) => {
      const productsN = productCount.get(m.household_id) ?? 0;
      const membersN = memberCount.get(m.household_id) ?? 0;
      const sharedBonus = m.role === 'member' ? 1_000 : 0;
      const score = productsN * 10_000 + membersN * 100 + sharedBonus;
      return { id: m.household_id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    householdId = scored[0]?.id ?? memberships[0].household_id;
  }

  cachedHouseholdUserId = user.id;
  cachedHouseholdId = householdId;
  return householdId;
}

/** Aceita convites pendentes do e-mail do utilizador (útil no login). */
export async function syncHouseholdMemberships(forUserId?: string) {
  if (forUserId && syncedInvitesUserId === forUserId) return;

  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  if (!user?.email) return;

  if (syncedInvitesUserId === user.id) return;

  const { data: invites, error } = await supabase
    .from('household_invites')
    .select('id')
    .eq('status', 'pending')
    .ilike('email', user.email);

  if (error) {
    console.warn('Erro ao buscar convites', error);
    return;
  }

  let accepted = false;
  for (const invite of invites ?? []) {
    const { error: acceptError } = await supabase.rpc('accept_household_invite', {
      invite_id: invite.id,
    });
    if (acceptError) {
      console.warn('Erro ao aceitar convite', acceptError);
    } else {
      accepted = true;
    }
  }

  syncedInvitesUserId = user.id;
  if (accepted) {
    cachedHouseholdId = null;
    cachedHouseholdUserId = null;
  }
}

export async function getHouseholdMembers(householdId: string) {
  const { data: members, error } = await supabase
    .from('household_members')
    .select('id, household_id, user_id, role, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!members?.length) return [] as HouseholdMember[];

  const userIds = members.map((m) => m.user_id);
  const profiles = await fetchProfilesByIds(userIds);

  const byId = new Map(profiles.map((p) => [p.id, p]));

  return members.map((m) => ({
    id: m.id,
    household_id: m.household_id,
    user_id: m.user_id,
    role: m.role as 'admin' | 'member',
    nome: byId.get(m.user_id)?.nome || 'Membro',
    email: byId.get(m.user_id)?.email ?? null,
    avatar_url: byId.get(m.user_id)?.avatar_url ?? null,
  }));
}

export async function getPendingInvites(householdId: string) {
  const { data, error } = await supabase
    .from('household_invites')
    .select('id, household_id, email, status')
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as HouseholdInvite[];
}

export async function inviteFamilyMember(householdId: string, email: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('Informe o e-mail do familiar.');

  const { data, error } = await supabase
    .from('household_invites')
    .insert({
      household_id: householdId,
      email: normalized,
      invited_by: auth.user.id,
      status: 'pending',
    })
    .select('id, household_id, email, status')
    .single();

  if (error) throw error;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle();

  if (existingProfile?.id) {
    await supabase.from('household_members').upsert(
      {
        household_id: householdId,
        user_id: existingProfile.id,
        role: 'member',
      },
      { onConflict: 'household_id,user_id' },
    );

    await supabase
      .from('household_invites')
      .update({ status: 'accepted' })
      .eq('id', data.id);
  }

  return data as HouseholdInvite;
}

export async function removeFamilyMember(memberId: string) {
  const { error } = await supabase.from('household_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function updateOwnProfile(
  nome: string,
  email?: string,
  avatarUrl?: string | null,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  const payload: { nome: string; email?: string; avatar_url?: string | null } = {
    nome: nome.trim(),
    ...(email ? { email: email.trim().toLowerCase() } : {}),
  };

  if (avatarUrl !== undefined && profileAvatarSupported !== false) {
    payload.avatar_url = avatarUrl;
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', auth.user.id);

  if (error) {
    if (avatarUrl !== undefined && isMissingAvatarColumn(error)) {
      profileAvatarSupported = false;
      delete payload.avatar_url;
      const { error: retryError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', auth.user.id);
      if (retryError) throw retryError;
      if (avatarUrl !== null) {
        throw new Error(
          'Execute no Supabase: alter table public.profiles add column if not exists avatar_url text;',
        );
      }
    } else {
      throw error;
    }
  } else if (avatarUrl !== undefined) {
    profileAvatarSupported = true;
  }

  // Mantém o nome do "Olá" e da sessão alinhados com o perfil
  setCachedDisplayName(auth.user.id, nome.trim());
  const { error: metaError } = await supabase.auth.updateUser({
    data: { nome: nome.trim() },
  });
  if (metaError) {
    console.warn('Erro ao atualizar metadata do utilizador', metaError);
  }
}

export async function getOwnProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  if (profileAvatarSupported !== false) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, avatar_url')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (!error) {
      profileAvatarSupported = true;
      if (data?.nome) setCachedDisplayName(auth.user.id, data.nome);
      return data;
    }

    if (isMissingAvatarColumn(error)) {
      profileAvatarSupported = false;
    } else {
      throw error;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) throw error;
  if (data?.nome) setCachedDisplayName(auth.user.id, data.nome);
  return data ? { ...data, avatar_url: null } : null;
}
