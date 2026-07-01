import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import type { UserRecord } from '../types/domain/user';
import { isUniqueViolation } from '../utils/dbErrors';
import { withDbRetry } from '../utils/dbRetry';

interface UserRow {
  id: string;
  clerk_user_id: string;
  customer_id: string;
  email: string;
  name: string;
  date_of_birth: string;
  user_type: UserRecord['userType'];
  gender: UserRecord['gender'];
  avatar_url: string | null;
  has_completed_onboarding: boolean;
  created_at: string;
  updated_at: string;
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    customerId: row.customer_id,
    email: row.email,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    userType: row.user_type,
    gender: row.gender,
    avatarUrl: row.avatar_url,
    hasCompletedOnboarding: row.has_completed_onboarding,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function findUserByClerkId(clerkUserId: string): Promise<UserRecord | null> {
  return withDbRetry(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (error) {
      wrapDbError(error);
    }

    return data ? mapUserRow(data as UserRow) : null;
  });
}

export interface CreateUserInput {
  clerkUserId: string;
  email?: string;
  name?: string;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .insert({
      clerk_user_id: input.clerkUserId,
      email: input.email ?? '',
      name: input.name ?? '',
    })
    .select('*')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      const existing = await findUserByClerkId(input.clerkUserId);
      if (existing) {
        return existing;
      }
    }
    wrapDbError(error);
  }

  return mapUserRow(data as UserRow);
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  dateOfBirth?: string;
  userType?: UserRecord['userType'];
  gender?: UserRecord['gender'];
  avatarUrl?: string | null;
  hasCompletedOnboarding?: boolean;
}

export async function updateUser(
  clerkUserId: string,
  input: UpdateUserInput,
): Promise<UserRecord> {
  return withDbRetry(async () => {
    const patch: Record<string, unknown> = {};

    if (input.email !== undefined) patch.email = input.email;
    if (input.name !== undefined) patch.name = input.name;
    if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth;
    if (input.userType !== undefined) patch.user_type = input.userType;
    if (input.gender !== undefined) patch.gender = input.gender;
    if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
    if (input.hasCompletedOnboarding !== undefined) {
      patch.has_completed_onboarding = input.hasCompletedOnboarding;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .update(patch)
      .eq('clerk_user_id', clerkUserId)
      .select('*')
      .single();

    if (error) {
      wrapDbError(error);
    }

    return mapUserRow(data as UserRow);
  });
}

export async function deleteUserByClerkId(clerkUserId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('users')
    .delete()
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    wrapDbError(error);
  }
}
