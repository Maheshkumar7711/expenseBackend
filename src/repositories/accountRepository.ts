import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import { isUniqueViolation } from '../utils/dbErrors';
import { runSupabaseQuery } from '../utils/dbRetry';
import { isActiveRow, softDeletePatch } from '../utils/softDelete';
import type {
  AccountRecord,
  AccountType,
  DeletedAccountNameRecord,
} from '../types/domain/account';

interface AccountRow {
  id: string;
  user_id: string;
  type: AccountType;
  name: string;
  opening_balance: number | string;
  deactivated: boolean;
  bank_name: string | null;
  bank_key: string | null;
  icon_key: string | null;
  created_at: string;
  updated_at: string;
}

interface DeletedAccountNameRow {
  user_id: string;
  account_id: string;
  name: string;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function mapAccountRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    name: row.name,
    openingBalance: toNumber(row.opening_balance),
    deactivated: row.deactivated,
    bankName: row.bank_name,
    bankKey: row.bank_key,
    iconKey: row.icon_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function listAccountsByUser(userId: string): Promise<AccountRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await isActiveRow(
      getSupabaseAdmin().from('accounts').select('*').eq('user_id', userId),
    ).order('created_at', { ascending: true });

    if (error) {
      wrapDbError(error);
    }

    return (data as AccountRow[]).map(mapAccountRow);
  });
}

async function findAccountByIdInternal(
  userId: string,
  accountId: string,
): Promise<AccountRecord | null> {
  const { data, error } = await isActiveRow(
    getSupabaseAdmin()
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('id', accountId),
  ).maybeSingle();

  if (error) {
    wrapDbError(error);
  }

  return data ? mapAccountRow(data as AccountRow) : null;
}

export async function findAccountById(
  userId: string,
  accountId: string,
): Promise<AccountRecord | null> {
  return runSupabaseQuery(async () => findAccountByIdInternal(userId, accountId));
}

export async function listDeletedAccountNames(
  userId: string,
): Promise<DeletedAccountNameRecord[]> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('deleted_account_names')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      wrapDbError(error);
    }

    return (data as DeletedAccountNameRow[]).map((row) => ({
      userId: row.user_id,
      accountId: row.account_id,
      name: row.name,
    }));
  });
}

export interface CreateAccountInput {
  id: string;
  userId: string;
  type: AccountType;
  name: string;
  openingBalance: number;
  deactivated?: boolean;
  bankName?: string;
  bankKey?: string;
  iconKey?: string;
}

export async function createAccount(input: CreateAccountInput): Promise<AccountRecord> {
  return runSupabaseQuery(async () => {
    const { data, error } = await getSupabaseAdmin()
      .from('accounts')
      .insert({
        id: input.id,
        user_id: input.userId,
        type: input.type,
        name: input.name,
        opening_balance: input.openingBalance,
        deactivated: input.deactivated ?? false,
        bank_name: input.bankName ?? null,
        bank_key: input.bankKey ?? null,
        icon_key: input.iconKey ?? null,
      })
      .select('*')
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        const existing = await findAccountByIdInternal(input.userId, input.id);
        if (existing) {
          return existing;
        }
      }
      wrapDbError(error);
    }

    return mapAccountRow(data as AccountRow);
  });
}

export interface UpdateAccountInput {
  type?: AccountType;
  name?: string;
  openingBalance?: number;
  deactivated?: boolean;
  bankName?: string | null;
  bankKey?: string | null;
  iconKey?: string | null;
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: UpdateAccountInput,
): Promise<AccountRecord> {
  return runSupabaseQuery(async () => {
    const patch: Record<string, unknown> = {};

    if (input.type !== undefined) patch.type = input.type;
    if (input.name !== undefined) patch.name = input.name;
    if (input.openingBalance !== undefined) patch.opening_balance = input.openingBalance;
    if (input.deactivated !== undefined) patch.deactivated = input.deactivated;
    if (input.bankName !== undefined) patch.bank_name = input.bankName;
    if (input.bankKey !== undefined) patch.bank_key = input.bankKey;
    if (input.iconKey !== undefined) patch.icon_key = input.iconKey;

    const { data, error } = await getSupabaseAdmin()
      .from('accounts')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', accountId)
      .select('*')
      .single();

    if (error) {
      wrapDbError(error);
    }

    return mapAccountRow(data as AccountRow);
  });
}

export async function deleteAccount(userId: string, accountId: string): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('accounts')
      .update(softDeletePatch())
      .eq('user_id', userId)
      .eq('id', accountId)
      .filter('deleted_at', 'is', null);

    if (error) {
      wrapDbError(error);
    }
  });
}

export async function upsertDeletedAccountName(
  userId: string,
  accountId: string,
  name: string,
): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('deleted_account_names')
      .upsert(
        {
          user_id: userId,
          account_id: accountId,
          name,
        },
        { onConflict: 'user_id,account_id' },
      );

    if (error) {
      wrapDbError(error);
    }
  });
}

export async function removeDeletedAccountName(
  userId: string,
  accountId: string,
): Promise<void> {
  return runSupabaseQuery(async () => {
    const { error } = await getSupabaseAdmin()
      .from('deleted_account_names')
      .delete()
      .eq('user_id', userId)
      .eq('account_id', accountId);

    if (error) {
      wrapDbError(error);
    }
  });
}
