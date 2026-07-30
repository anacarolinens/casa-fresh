import { supabase } from '@/lib/supabase';
import { getPrimaryHouseholdId } from '@/lib/households';

const PRODUCT_BUCKET = 'product-images';
const AVATAR_BUCKET = 'profile-avatars';

function guessExt(uri: string, mimeType?: string | null) {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (uri.toLowerCase().includes('.png')) return 'png';
  return 'jpg';
}

async function uploadImage(
  bucket: string,
  path: string,
  localUri: string,
  mimeType?: string | null,
  upsert = false,
) {
  const ext = guessExt(localUri, mimeType);
  const contentType = mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('bucket') && msg.includes('not found')) {
      throw new Error(
        `Bucket "${bucket}" não existe no Supabase. Abra o SQL Editor e execute o ficheiro supabase/storage.sql.`,
      );
    }
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadProductImage(localUri: string, mimeType?: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  const householdId = await getPrimaryHouseholdId();
  if (!householdId) throw new Error('Nenhuma casa encontrada');

  const ext = guessExt(localUri, mimeType);
  const path = `${householdId}/${auth.user.id}-${Date.now()}.${ext}`;
  return uploadImage(PRODUCT_BUCKET, path, localUri, mimeType);
}

export async function uploadProfileAvatar(localUri: string, mimeType?: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Não autenticado');

  const ext = guessExt(localUri, mimeType);
  const path = `${auth.user.id}/avatar.${ext}`;
  return uploadImage(AVATAR_BUCKET, path, localUri, mimeType, true);
}
