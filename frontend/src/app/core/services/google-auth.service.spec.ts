import { TestBed } from '@angular/core/testing';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GoogleAuthService],
    });
    service = TestBed.inject(GoogleAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns false for isConfigured when googleClientId is empty', () => {
    spyOn(service, 'getClientId').and.returnValue('');
    expect(service.isConfigured()).toBeFalse();
  });

  it('returns true for isConfigured when googleClientId is set', () => {
    spyOn(service, 'getClientId').and.returnValue('my-client-id.apps.googleusercontent.com');
    expect(service.isConfigured()).toBeTrue();
  });

  it('emits error if initialization fails due to unconfigured client ID', async () => {
    spyOn(service, 'getClientId').and.returnValue('');
    const initialized = await service.initializeGoogleId();
    expect(initialized).toBeFalse();
  });
});
