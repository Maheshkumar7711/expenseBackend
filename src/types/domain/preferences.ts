export interface CustomCategoryRecord {
  id: string;
  userId: string;
  name: string;
  linkedToKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomCategoryResponse {
  id: string;
  name: string;
  linkedToKey: string;
  updatedAt: string;
}

export interface CategoriesStateResponse {
  disabledCategoryKeys: Record<string, boolean>;
  customCategories: CustomCategoryResponse[];
}

export type FinancialMonthOption = 'January' | 'July';
export type DecimalPlaceOption = 0 | 1 | 2 | 3;

export interface UserPreferencesRecord {
  userId: string;
  currencyCode: string;
  countryCode: string;
  financialMonth: FinancialMonthOption;
  decimalPlaces: DecimalPlaceOption;
  disabledCategoryKeys: Record<string, boolean>;
  travelModeOn: boolean;
  travelSelectedCurrencyCode: string | null;
  travelStartDate: string | null;
  travelEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferencesResponse {
  currencyCode: string;
  countryCode: string;
  financialMonth: FinancialMonthOption;
  decimalPlaces: DecimalPlaceOption;
  travelModeOn: boolean;
  selectedCurrencyCode: string | null;
  travelStartDate: string | null;
  travelEndDate: string | null;
  updatedAt: string;
}
