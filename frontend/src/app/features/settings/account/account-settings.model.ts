import { AccountStatus, AuthenticatedUser, Company, CompanyPlan, UserRole } from '../../../core/models/auth.model';

export type AccountSettingsUser = AuthenticatedUser;
export type CompanyProfile = Company;
export type AccountRole = UserRole;
export type ProfileStatus = AccountStatus;
export type ProfilePlan = CompanyPlan;

export interface SettingsCapabilities {
  profileEditing: false;
  companyEditing: false;
  teamManagement: false;
  preferences: false;
}

