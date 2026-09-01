export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type CompanyPlan = 'STARTER' | 'BUSINESS' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface Company {
  id: string;
  companyName: string;
  email: string;
  mobile: string;
  plan: CompanyPlan;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUser {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string;
  role: UserRole;
  status: AccountStatus;
  authProvider?: 'LOCAL' | 'GOOGLE';
  googleId?: string | null;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  company: Company;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface AuthSession extends LoginResponse {}

export interface GoogleAuthRequest {
  credential: string;
}

export interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string | null;
  picture?: string | null;
}

export interface GoogleAuthOnboardingResponse {
  onboardingRequired: true;
  onboardingToken: string;
  profile: GoogleProfile;
}

export type GoogleAuthResponse = AuthSession | GoogleAuthOnboardingResponse;

export interface GoogleOnboardRequest {
  onboardingToken?: string;
  credential?: string;
  companyName: string;
  mobile: string;
  plan?: CompanyPlan;
}

export interface GoogleLinkRequest {
  credential: string;
}

export interface AuthError {
  message: string;
  status: number;
  code?: string;
  errors: unknown | null;
}

export interface AuthenticationJwtPayload {
  id: string;
  companyId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

