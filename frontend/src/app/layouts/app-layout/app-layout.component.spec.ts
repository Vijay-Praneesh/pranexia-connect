import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { AuthenticatedUser } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthorizationFeedbackService } from '../../core/services/authorization-feedback.service';
import { AppLayoutComponent } from './app-layout.component';

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  const user = {
    firstName: 'Asha',
    company: { companyName: 'Pranexia' },
  } as AuthenticatedUser;

  beforeEach(async () => {
    const auth = { currentUser$: of(user), logout: jasmine.createSpy('logout') };
    const feedback = { message$: new BehaviorSubject<string | null>(null), clear: jasmine.createSpy('clear') };
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: AuthorizationFeedbackService, useValue: feedback }],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
  });

  it('provides navigation to every supported authenticated section', () => {
    const hrefs = Array.from(fixture.nativeElement.querySelectorAll('.primary-nav a') as NodeListOf<HTMLAnchorElement>)
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/dashboard', '/customers', '/templates', '/campaigns', '/reports', '/notifications', '/settings', '/settings/whatsapp']);
  });

  it('labels the responsive navigation and keeps logout available', () => {
    expect(fixture.nativeElement.querySelector('nav[aria-label="Primary navigation"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Logout');
  });
});
