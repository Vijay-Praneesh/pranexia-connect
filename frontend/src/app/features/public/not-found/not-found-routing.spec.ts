import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { routes } from '../../../app.routes';
import { API_BASE_URL } from '../../../core/config/api-config.token';

describe('NotFound Routing Integration', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api' },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should navigate to valid home page on "/"', async () => {
    const success = await router.navigateByUrl('/');
    expect(success).toBeTrue();
    expect(location.path()).toBe('');
  });

  it('should navigate to valid about page on "/about"', async () => {
    const success = await router.navigateByUrl('/about');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/about');
  });

  it('should navigate to valid products page on "/products"', async () => {
    const success = await router.navigateByUrl('/products');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/products');
  });

  it('should navigate to valid pricing page on "/pricing"', async () => {
    const success = await router.navigateByUrl('/pricing');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/pricing');
  });

  it('should navigate to valid contact page on "/contact"', async () => {
    const success = await router.navigateByUrl('/contact');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/contact');
  });

  it('should match wildcard route for invalid URL "/aboutt"', async () => {
    const success = await router.navigateByUrl('/aboutt');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/aboutt');
  });

  it('should match wildcard route for invalid URL "/random-page"', async () => {
    const success = await router.navigateByUrl('/random-page');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/random-page');
  });

  it('should match wildcard route for invalid URL "/xyz123"', async () => {
    const success = await router.navigateByUrl('/xyz123');
    expect(success).toBeTrue();
    expect(location.path()).toBe('/xyz123');
  });
});
