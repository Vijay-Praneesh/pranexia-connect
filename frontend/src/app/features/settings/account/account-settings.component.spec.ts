import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AuthenticatedUser } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { AccountSettingsComponent } from './account-settings.component';
import { AccountSettingsService } from './account-settings.service';

describe('AccountSettingsComponent', () => {
  let fixture: ComponentFixture<AccountSettingsComponent>; let component: AccountSettingsComponent; let api: jasmine.SpyObj<AccountSettingsService>; let auth: jasmine.SpyObj<AuthService>;
  const user = { id: 'u1', companyId: 'c1', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', mobile: '1234567890', role: 'COMPANY_ADMIN', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', company: { id: 'c1', companyName: 'Pranexia', email: 'company@example.com', mobile: '1234567890', plan: 'STARTER', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' } } as AuthenticatedUser;

  async function create(sessionUser: AuthenticatedUser | null = user): Promise<void> {
    api = jasmine.createSpyObj('AccountSettingsService', ['getCurrentUser']); api.getCurrentUser.and.returnValue(of(user)); auth = jasmine.createSpyObj('AuthService', ['getCurrentUser']); auth.getCurrentUser.and.returnValue(sessionUser);
    await TestBed.configureTestingModule({ imports: [AccountSettingsComponent], providers: [provideRouter([]), { provide: AccountSettingsService, useValue: api }, { provide: AuthService, useValue: auth }] }).compileComponents();
    fixture = TestBed.createComponent(AccountSettingsComponent); component = fixture.componentInstance; fixture.detectChanges();
  }
  afterEach(() => TestBed.resetTestingModule());

  it('renders current account information by default', async () => { await create(); const text = fixture.nativeElement.textContent; expect(text).toContain('Asha Rao'); expect(text).toContain('asha@example.com'); expect(text).not.toContain('Company name'); });
  it('switches all tabs locally without changing the settings URL', async () => { await create(); const router = TestBed.inject(Router); spyOnProperty(router, 'url', 'get').and.returnValue('/settings'); const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>; expect(buttons.length).toBe(4); buttons[1].click(); fixture.detectChanges(); expect(component.activeTab).toBe('company'); expect(fixture.nativeElement.textContent).toContain('Pranexia'); expect(fixture.nativeElement.textContent).toContain('STARTER'); buttons[2].click(); fixture.detectChanges(); expect(component.activeTab).toBe('team'); expect(fixture.nativeElement.textContent).toContain('Team management is not currently available'); buttons[3].click(); fixture.detectChanges(); expect(component.activeTab).toBe('preferences'); expect(fixture.nativeElement.textContent).toContain('Account preferences are not currently available'); buttons[0].click(); fixture.detectChanges(); expect(component.activeTab).toBe('account'); expect(router.url).toBe('/settings'); });
  it('uses buttons instead of hash links for settings tabs', async () => { await create(); expect(fixture.nativeElement.querySelector('.settings-nav a')).toBeNull(); expect(fixture.nativeElement.querySelector('[href="#account"]')).toBeNull(); expect(fixture.nativeElement.querySelector('[href="#company"]')).toBeNull(); expect(fixture.nativeElement.querySelector('[href="#team"]')).toBeNull(); expect(fixture.nativeElement.querySelector('[href="#preferences"]')).toBeNull(); });
  it('keeps all returned profile fields read-only', async () => { await create(); expect(fixture.nativeElement.querySelector('input')).toBeNull(); expect(fixture.nativeElement.querySelector('form')).toBeNull(); expect(component.capabilities.profileEditing).toBeFalse(); expect(component.capabilities.companyEditing).toBeFalse(); });
  it('renders unsupported team and preference states when selected', async () => { await create(); component.selectTab('team'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Team management is not currently available'); component.selectTab('preferences'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Account preferences are not currently available'); });
  it('refreshes company-admin data and provides success-authoritative values', async () => { await create(); expect(api.getCurrentUser).toHaveBeenCalled(); api.getCurrentUser.calls.reset(); component.refresh(); expect(api.getCurrentUser).toHaveBeenCalled(); expect(component.user).toEqual(user); });
  it('shows a loading state while refreshing', async () => { await create(); const pending = new Subject<AuthenticatedUser>(); api.getCurrentUser.and.returnValue(pending); component.refresh(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Refreshing account information'); pending.next(user); pending.complete(); });
  it('shows safe API errors while preserving session data', async () => { await create(); api.getCurrentUser.and.returnValue(throwError(() => ({ status: 500 }))); component.refresh(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('last authenticated account information remains displayed'); expect(fixture.nativeElement.textContent).not.toContain('stack'); });
  it('does not call the admin-only endpoint for non-admin roles', async () => { await create({ ...user, role: 'MANAGER' }); expect(api.getCurrentUser).not.toHaveBeenCalled(); expect(fixture.nativeElement.textContent).toContain('restricted by the backend to company administrators'); });
  it('handles missing authenticated account data', async () => { await create(null); expect(fixture.nativeElement.textContent).toContain('Account unavailable'); expect(api.getCurrentUser).not.toHaveBeenCalled(); });
});
