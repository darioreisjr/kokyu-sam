/**
 * Domain representation of a row in public.profiles, decoupled from the
 * Supabase-generated (snake_case) row shape. Controllers/services never
 * see the raw database row directly - see docs/architecture.md
 * ("Data mapping").
 */
export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}
