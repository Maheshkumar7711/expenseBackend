import { getClerkClient } from '../integrations/clerkAuth';
import * as accountRepository from '../repositories/accountRepository';
import * as userRepository from '../repositories/userRepository';
import type { MeResponse, UserRecord } from '../types/domain/user';

const DEFAULT_ACCOUNTS = [
  { id: 'cash', type: 'cash' as const, name: 'Cash', iconKey: 'walletOutline' },
  { id: 'savings', type: 'bank' as const, name: 'Savings', iconKey: 'trendingUpOutline' },
];

async function seedDefaultAccounts(userId: string): Promise<void> {
  const existing = await accountRepository.listAccountsByUser(userId);
  if (existing.length > 0) {
    return;
  }

  await Promise.all(
    DEFAULT_ACCOUNTS.map((account) =>
      accountRepository.createAccount({
        id: account.id,
        userId,
        type: account.type,
        name: account.name,
        openingBalance: 0,
        iconKey: account.iconKey,
      }),
    ),
  );
}

async function fetchClerkProfile(clerkUserId: string): Promise<{ email: string; name: string }> {
  try {
    const user = await getClerkClient().users.getUser(clerkUserId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      '';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return { email, name };
  } catch {
    return { email: '', name: '' };
  }
}

async function ensureUserInternal(clerkUserId: string): Promise<UserRecord> {
  const existing = await userRepository.findUserByClerkId(clerkUserId);
  if (existing) {
    if (!existing.email.trim() || !existing.name.trim()) {
      const profile = await fetchClerkProfile(clerkUserId);
      return userRepository.updateUser(clerkUserId, {
        email: existing.email.trim() ? existing.email : profile.email,
        name: existing.name.trim() ? existing.name : profile.name,
      });
    }
    return existing;
  }

  const profile = await fetchClerkProfile(clerkUserId);
  const user = await userRepository.createUser({
    clerkUserId,
    email: profile.email,
    name: profile.name,
  });

  await seedDefaultAccounts(user.id);
  return user;
}

const ensureUserInflight = new Map<string, Promise<UserRecord>>();

export async function ensureUser(clerkUserId: string): Promise<UserRecord> {
  const inflight = ensureUserInflight.get(clerkUserId);
  if (inflight) {
    return inflight;
  }

  const promise = ensureUserInternal(clerkUserId).finally(() => {
    ensureUserInflight.delete(clerkUserId);
  });
  ensureUserInflight.set(clerkUserId, promise);
  return promise;
}

export async function getMe(clerkUserId: string): Promise<MeResponse> {
  const user = await ensureUser(clerkUserId);
  return toMeResponse(user);
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  userType?: UserRecord['userType'];
  gender?: UserRecord['gender'];
  avatarUrl?: string | null;
  hasCompletedOnboarding?: boolean;
}

export async function updateProfile(
  clerkUserId: string,
  input: UpdateProfileInput,
): Promise<MeResponse> {
  await ensureUser(clerkUserId);
  const user = await userRepository.updateUser(clerkUserId, {
    name: input.name,
    email: input.email,
    dateOfBirth: input.dateOfBirth,
    userType: input.userType,
    gender: input.gender,
    avatarUrl: input.avatarUrl,
    hasCompletedOnboarding: input.hasCompletedOnboarding,
  });

  return toMeResponse(user);
}

function toMeResponse(user: UserRecord): MeResponse {
  return {
    clerkUserId: user.clerkUserId,
    customerId: user.customerId,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    profile: {
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      userType: user.userType,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
    },
  };
}

/** Idempotent cleanup when Clerk deletes a user (webhook). Cascades child rows via FK. */
export async function deleteUserByClerkId(clerkUserId: string): Promise<void> {
  const existing = await userRepository.findUserByClerkId(clerkUserId);
  if (!existing) {
    return;
  }
  await userRepository.deleteUserByClerkId(clerkUserId);
}
