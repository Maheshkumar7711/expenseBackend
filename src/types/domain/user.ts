export type UserGender = 'Male' | 'Female';
export type UserType = 'Student' | 'Professional' | 'Self Employed' | 'Retired';

export interface UserRecord {
  id: string;
  clerkUserId: string;
  customerId: string;
  email: string;
  name: string;
  dateOfBirth: string;
  userType: UserType;
  gender: UserGender;
  avatarUrl: string | null;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  dateOfBirth: string;
  userType: UserType;
  gender: UserGender;
  avatarUrl: string | null;
}

export interface MeResponse {
  clerkUserId: string;
  customerId: string;
  profile: UserProfile;
  hasCompletedOnboarding: boolean;
}
