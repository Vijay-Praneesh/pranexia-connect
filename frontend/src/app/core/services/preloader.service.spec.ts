import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { PreloaderService } from './preloader.service';

describe('PreloaderService', () => {
  let service: PreloaderService;
  let routerEvents$: Subject<any>;
  let mockRouter: { events: Subject<any> };

  beforeEach(() => {
    routerEvents$ = new Subject<any>();
    mockRouter = {
      events: routerEvents$,
    };

    TestBed.configureTestingModule({
      providers: [
        PreloaderService,
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(PreloaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isLoading()).toBeFalse();
  });

  it('should show preloader on NavigationStart and hide on NavigationEnd with smooth timing', fakeAsync(() => {
    routerEvents$.next(new NavigationStart(1, '/about'));
    expect(service.isLoading()).toBeTrue();
    expect(service.isFadingOut()).toBeFalse();

    routerEvents$.next(new NavigationEnd(1, '/about', '/about'));

    // Wait for the minimum display duration (280ms)
    tick(280);
    expect(service.isFadingOut()).toBeTrue();

    // Wait for fade out animation (220ms)
    tick(220);
    expect(service.isLoading()).toBeFalse();
    expect(service.isFadingOut()).toBeFalse();
  }));

  it('should support manual show and hide', fakeAsync(() => {
    service.show('Loading details...');
    expect(service.isLoading()).toBeTrue();
    expect(service.message()).toBe('Loading details...');

    service.hide();

    // Wait for minimum display time
    tick(280);
    expect(service.isFadingOut()).toBeTrue();

    // Wait for fade out animation
    tick(220);
    expect(service.isLoading()).toBeFalse();
    expect(service.isFadingOut()).toBeFalse();
  }));
});
