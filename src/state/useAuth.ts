import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { UserProfile } from '@/domain/types';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

/**
 * Sesión de usuario. Dos modos:
 *  - Cuenta Supabase (email + contraseña): datos sincronizados en la nube.
 *  - Invitado ("local"): todo queda en el dispositivo; puede crear cuenta
 *    más tarde y conservar sus datos (mismo almacén, distinta clave de scope).
 */

const GUEST_KEY = 'gt:guest-mode';
export const GUEST_USER_ID = 'local';

const DEFAULT_PROFILE: UserProfile = {
  fullName: '',
  email: '',
  birthYear: '',
  heightCm: '',
  goal: 'general_fitness',
  experience: 'intermediate',
  bio: '',
};

interface AuthState {
  ready: boolean;
  user: User | null;
  isGuest: boolean;
  profile: UserProfile;
  /** Id con el que se escopan los datos locales. */
  userId: string | null;
  cloudEnabled: boolean;

  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  /**
   * Canjea un id_token de Google o Apple por una sesión de Supabase.
   * `fullName` solo llega de Apple y solo en el primer inicio de sesión.
   */
  signInWithIdToken: (
    provider: 'google' | 'apple',
    idToken: string,
    fullName?: string,
  ) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const sanitizeProfile = (raw: unknown): UserProfile => {
  const src = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return {
    fullName: s(src.fullName, 60),
    email: s(src.email, 120),
    birthYear: s(src.birthYear, 4),
    heightCm: s(src.heightCm, 3),
    goal: (['general_fitness', 'muscle_gain', 'strength', 'fat_loss', 'performance'] as const).includes(
      src.goal as UserProfile['goal'],
    )
      ? (src.goal as UserProfile['goal'])
      : 'general_fitness',
    experience: (['beginner', 'intermediate', 'advanced'] as const).includes(
      src.experience as UserProfile['experience'],
    )
      ? (src.experience as UserProfile['experience'])
      : 'intermediate',
    bio: s(src.bio, 220),
  };
};

const profileKey = (userId: string) => `gt:u:${userId}:profile`;

async function loadLocalProfile(userId: string): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(profileKey(userId));
    return raw ? sanitizeProfile(JSON.parse(raw)) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

async function fetchCloudProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name,email,profile_data')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return sanitizeProfile({
    ...(data.profile_data as Record<string, unknown>),
    fullName: data.full_name,
    email: data.email,
  });
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  user: null,
  isGuest: false,
  profile: DEFAULT_PROFILE,
  userId: null,
  cloudEnabled: isSupabaseConfigured,

  bootstrap: async () => {
    const supabase = getSupabase();
    let session: AuthSession | null = null;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      session = data.session;
      supabase.auth.onAuthStateChange((_event, next) => {
        const current = get();
        // Solo reaccionar a cierres/expiraciones; los inicios se manejan en signIn/signUp
        if (!next && current.user) {
          set({ user: null, userId: null, profile: DEFAULT_PROFILE });
        }
      });
    }
    if (session?.user) {
      const cloudProfile = await fetchCloudProfile(session.user.id);
      set({
        ready: true,
        user: session.user,
        isGuest: false,
        userId: session.user.id,
        profile: cloudProfile ?? (await loadLocalProfile(session.user.id)),
      });
      return;
    }
    const guest = await AsyncStorage.getItem(GUEST_KEY);
    if (guest === '1') {
      set({
        ready: true,
        user: null,
        isGuest: true,
        userId: GUEST_USER_ID,
        profile: await loadLocalProfile(GUEST_USER_ID),
      });
      return;
    }
    set({ ready: true, user: null, isGuest: false, userId: null });
  },

  signIn: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return 'La nube no está configurada en esta build.';
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.message;
    const user = data.user;
    if (!user) return 'No se pudo iniciar sesión.';
    await AsyncStorage.removeItem(GUEST_KEY);
    const cloudProfile = await fetchCloudProfile(user.id);
    set({
      user,
      isGuest: false,
      userId: user.id,
      profile: cloudProfile ?? (await loadLocalProfile(user.id)),
    });
    return null;
  },

  signInWithIdToken: async (provider, idToken, fullName) => {
    const supabase = getSupabase();
    if (!supabase) return 'La nube no está configurada en esta build.';
    const { data, error } = await supabase.auth.signInWithIdToken({ provider, token: idToken });
    if (error) return error.message;
    const user = data.user;
    if (!user) return 'No se pudo iniciar sesión.';
    await AsyncStorage.removeItem(GUEST_KEY);

    const cloudProfile = await fetchCloudProfile(user.id);
    const stored = cloudProfile ?? (await loadLocalProfile(user.id));
    // Apple solo entrega el nombre la primera vez: si aún no tenemos uno, se
    // guarda ahora o se pierde para siempre. Google lo trae en el id_token.
    const derivedName =
      stored.fullName ||
      fullName?.trim() ||
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      (user.user_metadata?.name as string | undefined)?.trim() ||
      '';
    const profile = sanitizeProfile({ ...stored, fullName: derivedName, email: stored.email || user.email || '' });

    set({ user, isGuest: false, userId: user.id, profile });
    if (profile.fullName !== stored.fullName || profile.email !== stored.email) {
      await AsyncStorage.setItem(profileKey(user.id), JSON.stringify(profile));
    }
    return null;
  },

  signUp: async (email, password, fullName) => {
    const supabase = getSupabase();
    if (!supabase) return 'La nube no está configurada en esta build.';
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return error.message;
    const user = data.user;
    if (!user) return 'Revisa tu correo para confirmar la cuenta.';
    if (!data.session) return 'CONFIRM_EMAIL';
    await AsyncStorage.removeItem(GUEST_KEY);
    const profile = { ...DEFAULT_PROFILE, fullName: fullName.trim(), email: email.trim() };
    await AsyncStorage.setItem(profileKey(user.id), JSON.stringify(profile));
    set({ user, isGuest: false, userId: user.id, profile });
    return null;
  },

  resetPassword: async (email) => {
    const supabase = getSupabase();
    if (!supabase) return 'La nube no está configurada en esta build.';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return error ? error.message : null;
  },

  continueAsGuest: async () => {
    await AsyncStorage.setItem(GUEST_KEY, '1');
    set({
      user: null,
      isGuest: true,
      userId: GUEST_USER_ID,
      profile: await loadLocalProfile(GUEST_USER_ID),
    });
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (supabase && get().user) await supabase.auth.signOut();
    await AsyncStorage.removeItem(GUEST_KEY);
    set({ user: null, isGuest: false, userId: null, profile: DEFAULT_PROFILE });
  },

  saveProfile: async (patch) => {
    const { userId, profile, user } = get();
    if (!userId) return;
    const next = sanitizeProfile({ ...profile, ...patch });
    set({ profile: next });
    await AsyncStorage.setItem(profileKey(userId), JSON.stringify(next));
    const supabase = getSupabase();
    if (supabase && user) {
      const { fullName, email, ...rest } = next;
      await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: fullName, email: email || user.email || '', profile_data: rest });
    }
  },
}));
