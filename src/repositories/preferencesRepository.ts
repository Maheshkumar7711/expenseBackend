import { getSupabaseAdmin } from '../integrations/supabaseClient';
import { InternalServerError } from '../errors';
import type {
  CustomCategoryRecord,
  DecimalPlaceOption,
  FinancialMonthOption,
  UserPreferencesRecord,
} from '../types/domain/preferences';
import { isUniqueViolation } from '../utils/dbErrors';
import { withDbRetry } from '../utils/dbRetry';
import { isActiveRow, softDeletePatch } from '../utils/softDelete';

interface PreferencesRow {
  user_id: string;
  currency_code: string;
  country_code: string;
  financial_month: FinancialMonthOption;
  decimal_places: number;
  disabled_category_keys: Record<string, boolean>;
  travel_mode_on: boolean;
  travel_selected_currency_code: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomCategoryRow {
  id: string;
  user_id: string;
  name: string;
  linked_to_key: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES = {
  currency_code: 'PKR',
  country_code: 'PAK',
  financial_month: 'January' as FinancialMonthOption,
  decimal_places: 0 as DecimalPlaceOption,
  disabled_category_keys: {},
  travel_mode_on: false,
  travel_selected_currency_code: null,
  travel_start_date: null,
  travel_end_date: null,
};

function mapPreferencesRow(row: PreferencesRow): UserPreferencesRecord {
  return {
    userId: row.user_id,
    currencyCode: row.currency_code,
    countryCode: row.country_code,
    financialMonth: row.financial_month,
    decimalPlaces: row.decimal_places as DecimalPlaceOption,
    disabledCategoryKeys:
      row.disabled_category_keys && typeof row.disabled_category_keys === 'object'
        ? row.disabled_category_keys
        : {},
    travelModeOn: row.travel_mode_on,
    travelSelectedCurrencyCode: row.travel_selected_currency_code,
    travelStartDate: row.travel_start_date,
    travelEndDate: row.travel_end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCustomCategoryRow(row: CustomCategoryRow): CustomCategoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    linkedToKey: row.linked_to_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function wrapDbError(error: { message: string }): never {
  throw new InternalServerError(`Database error: ${error.message}`);
}

export async function getOrCreatePreferences(
  userId: string,
): Promise<UserPreferencesRecord> {
  return withDbRetry(async () => getOrCreatePreferencesInternal(userId));
}

async function getOrCreatePreferencesInternal(
  userId: string,
): Promise<UserPreferencesRecord> {
  const { data, error } = await getSupabaseAdmin()
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) wrapDbError(error);
  if (data) return mapPreferencesRow(data as PreferencesRow);

  const { data: created, error: insertError } = await getSupabaseAdmin()
    .from('user_preferences')
    .insert({ user_id: userId, ...DEFAULT_PREFERENCES })
    .select('*')
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      const { data: retry, error: retryError } = await getSupabaseAdmin()
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (retryError) wrapDbError(retryError);
      if (retry) return mapPreferencesRow(retry as PreferencesRow);
    }
    wrapDbError(insertError);
  }
  return mapPreferencesRow(created as PreferencesRow);
}

export interface UpdatePreferencesInput {
  currencyCode?: string;
  countryCode?: string;
  financialMonth?: FinancialMonthOption;
  decimalPlaces?: DecimalPlaceOption;
  disabledCategoryKeys?: Record<string, boolean>;
  travelModeOn?: boolean;
  travelSelectedCurrencyCode?: string | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<UserPreferencesRecord> {
  return withDbRetry(async () => updatePreferencesInternal(userId, input));
}

async function updatePreferencesInternal(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<UserPreferencesRecord> {
  await getOrCreatePreferencesInternal(userId);

  const patch: Record<string, unknown> = {};
  if (input.currencyCode !== undefined) patch.currency_code = input.currencyCode;
  if (input.countryCode !== undefined) patch.country_code = input.countryCode;
  if (input.financialMonth !== undefined) patch.financial_month = input.financialMonth;
  if (input.decimalPlaces !== undefined) patch.decimal_places = input.decimalPlaces;
  if (input.disabledCategoryKeys !== undefined) {
    patch.disabled_category_keys = input.disabledCategoryKeys;
  }
  if (input.travelModeOn !== undefined) patch.travel_mode_on = input.travelModeOn;
  if (input.travelSelectedCurrencyCode !== undefined) {
    patch.travel_selected_currency_code = input.travelSelectedCurrencyCode;
  }
  if (input.travelStartDate !== undefined) patch.travel_start_date = input.travelStartDate;
  if (input.travelEndDate !== undefined) patch.travel_end_date = input.travelEndDate;

  const { data, error } = await getSupabaseAdmin()
    .from('user_preferences')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) wrapDbError(error);
  return mapPreferencesRow(data as PreferencesRow);
}

export async function listCustomCategories(userId: string): Promise<CustomCategoryRecord[]> {
  return withDbRetry(async () => listCustomCategoriesInternal(userId));
}

async function listCustomCategoriesInternal(userId: string): Promise<CustomCategoryRecord[]> {
  const { data, error } = await isActiveRow(
    getSupabaseAdmin().from('custom_categories').select('*').eq('user_id', userId),
  ).order('created_at', { ascending: true });

  if (error) wrapDbError(error);
  return (data as CustomCategoryRow[]).map(mapCustomCategoryRow);
}

export async function findCustomCategoryById(
  userId: string,
  categoryId: string,
): Promise<CustomCategoryRecord | null> {
  return withDbRetry(async () => findCustomCategoryByIdInternal(userId, categoryId));
}

async function findCustomCategoryByIdInternal(
  userId: string,
  categoryId: string,
): Promise<CustomCategoryRecord | null> {
  const { data, error } = await isActiveRow(
    getSupabaseAdmin()
      .from('custom_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('id', categoryId),
  ).maybeSingle();

  if (error) wrapDbError(error);
  return data ? mapCustomCategoryRow(data as CustomCategoryRow) : null;
}

export interface CreateCustomCategoryInput {
  id: string;
  userId: string;
  name: string;
  linkedToKey: string;
}

export async function createCustomCategory(
  input: CreateCustomCategoryInput,
): Promise<CustomCategoryRecord> {
  return withDbRetry(async () => createCustomCategoryInternal(input));
}

async function createCustomCategoryInternal(
  input: CreateCustomCategoryInput,
): Promise<CustomCategoryRecord> {
  const { data, error } = await getSupabaseAdmin()
    .from('custom_categories')
    .insert({
      id: input.id,
      user_id: input.userId,
      name: input.name,
      linked_to_key: input.linkedToKey,
    })
    .select('*')
    .single();

  if (error) wrapDbError(error);
  return mapCustomCategoryRow(data as CustomCategoryRow);
}

export interface UpdateCustomCategoryInput {
  name?: string;
  linkedToKey?: string;
}

export async function updateCustomCategory(
  userId: string,
  categoryId: string,
  input: UpdateCustomCategoryInput,
): Promise<CustomCategoryRecord> {
  return withDbRetry(async () => updateCustomCategoryInternal(userId, categoryId, input));
}

async function updateCustomCategoryInternal(
  userId: string,
  categoryId: string,
  input: UpdateCustomCategoryInput,
): Promise<CustomCategoryRecord> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.linkedToKey !== undefined) patch.linked_to_key = input.linkedToKey;

  const { data, error } = await getSupabaseAdmin()
    .from('custom_categories')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) wrapDbError(error);
  return mapCustomCategoryRow(data as CustomCategoryRow);
}

export async function deleteCustomCategory(
  userId: string,
  categoryId: string,
): Promise<void> {
  return withDbRetry(async () => deleteCustomCategoryInternal(userId, categoryId));
}

async function deleteCustomCategoryInternal(userId: string, categoryId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('custom_categories')
    .update(softDeletePatch())
    .eq('user_id', userId)
    .eq('id', categoryId)
    .filter('deleted_at', 'is', null);

  if (error) wrapDbError(error);
}
