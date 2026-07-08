import * as preferencesRepository from '../repositories/preferencesRepository';
import { NotFoundError } from '../errors';
import type {
  CategoriesStateResponse,
  CustomCategoryRecord,
  CustomCategoryResponse,
  DecimalPlaceOption,
  FinancialMonthOption,
  UserPreferencesRecord,
  UserPreferencesResponse,
} from '../types/domain/preferences';
import { generateId } from '../utils/generateId';
import { ensureUser } from './userService';
import { emitDelete, emitUpsert } from './syncChangeEmitter';

function toPreferencesResponse(record: UserPreferencesRecord): UserPreferencesResponse {
  return {
    currencyCode: record.currencyCode,
    countryCode: record.countryCode,
    financialMonth: record.financialMonth,
    decimalPlaces: record.decimalPlaces,
    travelModeOn: record.travelModeOn,
    selectedCurrencyCode: record.travelSelectedCurrencyCode,
    travelStartDate: record.travelStartDate,
    travelEndDate: record.travelEndDate,
    updatedAt: record.updatedAt,
  };
}

function toCustomCategoryResponse(record: CustomCategoryRecord): CustomCategoryResponse {
  return {
    id: record.id,
    name: record.name,
    linkedToKey: record.linkedToKey,
    updatedAt: record.updatedAt,
  };
}

export async function getPreferences(clerkUserId: string): Promise<UserPreferencesResponse> {
  const user = await ensureUser(clerkUserId);
  const record = await preferencesRepository.getOrCreatePreferences(user.id);
  return toPreferencesResponse(record);
}

export interface PreferencesBootstrapData {
  preferences: UserPreferencesResponse;
  categories: CategoriesStateResponse;
}

/** Single preferences round-trip for bootstrap sync (avoids duplicate getOrCreatePreferences). */
export async function getPreferencesBootstrap(
  clerkUserId: string,
): Promise<PreferencesBootstrapData> {
  const user = await ensureUser(clerkUserId);

  const [preferencesRecord, customCategories] = await Promise.all([
    preferencesRepository.getOrCreatePreferences(user.id),
    preferencesRepository.listCustomCategories(user.id),
  ]);

  return {
    preferences: toPreferencesResponse(preferencesRecord),
    categories: {
      disabledCategoryKeys: preferencesRecord.disabledCategoryKeys,
      customCategories: customCategories.map(toCustomCategoryResponse),
    },
  };
}

export interface UpdatePreferencesInput {
  currencyCode?: string;
  countryCode?: string;
  financialMonth?: FinancialMonthOption;
  decimalPlaces?: DecimalPlaceOption;
  travelModeOn?: boolean;
  selectedCurrencyCode?: string | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
}

export async function updatePreferences(
  clerkUserId: string,
  input: UpdatePreferencesInput,
): Promise<UserPreferencesResponse> {
  const user = await ensureUser(clerkUserId);

  const record = await preferencesRepository.updatePreferences(user.id, {
    currencyCode: input.currencyCode?.trim().toUpperCase(),
    countryCode: input.countryCode?.trim().toUpperCase(),
    financialMonth: input.financialMonth,
    decimalPlaces: input.decimalPlaces,
    travelModeOn: input.travelModeOn,
    travelSelectedCurrencyCode:
      input.selectedCurrencyCode === null
        ? null
        : input.selectedCurrencyCode?.trim().toUpperCase(),
    travelStartDate: input.travelStartDate,
    travelEndDate: input.travelEndDate,
  });

  const response = toPreferencesResponse(record);
  await emitUpsert(user.id, 'preferences', 'user', response);
  return response;
}

export async function getCategoriesState(clerkUserId: string): Promise<CategoriesStateResponse> {
  const user = await ensureUser(clerkUserId);

  const [preferences, customCategories] = await Promise.all([
    preferencesRepository.getOrCreatePreferences(user.id),
    preferencesRepository.listCustomCategories(user.id),
  ]);

  return {
    disabledCategoryKeys: preferences.disabledCategoryKeys,
    customCategories: customCategories.map(toCustomCategoryResponse),
  };
}

export async function updateDisabledCategories(
  clerkUserId: string,
  disabledCategoryKeys: Record<string, boolean>,
): Promise<CategoriesStateResponse> {
  const user = await ensureUser(clerkUserId);
  await preferencesRepository.updatePreferences(user.id, { disabledCategoryKeys });
  const state = await getCategoriesState(clerkUserId);
  await emitUpsert(user.id, 'disabledCategories', 'user', state.disabledCategoryKeys);
  return state;
}

export interface CreateCustomCategoryInput {
  id?: string;
  name: string;
  linkedToKey: string;
}

export async function createCustomCategory(
  clerkUserId: string,
  input: CreateCustomCategoryInput,
): Promise<CustomCategoryResponse> {
  const user = await ensureUser(clerkUserId);

  const id = input.id ?? generateId('custom');
  const existing = await preferencesRepository.findCustomCategoryById(user.id, id);
  if (existing) {
    return toCustomCategoryResponse(existing);
  }

  const record = await preferencesRepository.createCustomCategory({
    id,
    userId: user.id,
    name: input.name,
    linkedToKey: input.linkedToKey,
  });

  const response = toCustomCategoryResponse(record);
  await emitUpsert(user.id, 'customCategory', response.id, response);
  return response;
}

export interface UpdateCustomCategoryInput {
  name?: string;
  linkedToKey?: string;
}

export async function updateCustomCategory(
  clerkUserId: string,
  categoryId: string,
  input: UpdateCustomCategoryInput,
): Promise<CustomCategoryResponse> {
  const user = await ensureUser(clerkUserId);

  const existing = await preferencesRepository.findCustomCategoryById(user.id, categoryId);
  if (!existing) {
    throw new NotFoundError('Custom category', categoryId);
  }

  const record = await preferencesRepository.updateCustomCategory(user.id, categoryId, input);
  const response = toCustomCategoryResponse(record);
  await emitUpsert(user.id, 'customCategory', response.id, response);
  return response;
}

export async function deleteCustomCategory(
  clerkUserId: string,
  categoryId: string,
): Promise<void> {
  const user = await ensureUser(clerkUserId);

  const existing = await preferencesRepository.findCustomCategoryById(user.id, categoryId);
  if (!existing) {
    throw new NotFoundError('Custom category', categoryId);
  }

  await preferencesRepository.deleteCustomCategory(user.id, categoryId);
  await emitDelete(user.id, 'customCategory', categoryId);
}
