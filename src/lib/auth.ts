import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

function getRedirectUrl() {
  return window.location.origin;
}

async function signInWithGoogleOAuth() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

// Google OAuth handles both sign-in and first-time account creation.
export async function signInWithGoogle() {
  return signInWithGoogleOAuth();
}

// Kept as a separate function for explicit "register with Google" UI actions.
export async function signUpWithGoogle() {
  return signInWithGoogleOAuth();
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? '',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function sendPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl(),
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    throw error;
  }
}

export async function upsertProfileForUser(user: User) {
  const fullName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    null;

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw error;
  }
}
