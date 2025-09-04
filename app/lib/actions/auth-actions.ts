'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';

const isValidEmail = (email: string): boolean => {
  // Basic email regex for format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isStrongPassword = (password: string): boolean => {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]:;\"\'<>,.?/~`]).{8,}$/;
  return strongPasswordRegex.test(password);
};

export async function login(data: LoginFormData) {
  if (!isValidEmail(data.email) || !isStrongPassword(data.password)) {
    return { error: "Invalid credentials." };
  }
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    // Return a generic error message to prevent user enumeration
    return { error: "Invalid credentials." };
  }

  // Success: no error
  return { error: null };
}

export async function register(data: RegisterFormData) {
  if (!isValidEmail(data.email)) {
    return { error: "Invalid email format." };
  }
  if (!isStrongPassword(data.password)) {
    return { error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character." };
  }
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        is_admin: false, // Default to false for new registrations
      },
    },
  });

  if (error) {
    return { error: "Registration failed." }; // More generic error
  }

  // Success: no error
  return { error: null };
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user; // data.user already contains user_metadata
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
