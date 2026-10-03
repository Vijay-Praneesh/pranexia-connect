import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { NotFoundComponent } from './not-found.component';
import { SeoService } from '../../../core/services/seo.service';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let titleService: Title;
  let metaService: Meta;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([]), SeoService, Title, Meta],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    titleService = TestBed.inject(Title);
    metaService = TestBed.inject(Meta);
    fixture.detectChanges();
  });

  it('should create the 404 not found component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand logo', () => {
    const logo = fixture.nativeElement.querySelector('.brand-logo') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo.src).toContain('assets/seyyon-logo.png');
  });

  it('should render the 404 display and H1 heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('Oops! This page went off the grid.');

    const display404 = compiled.querySelector('.display-404');
    expect(display404?.textContent).toContain('4');
    expect(display404?.textContent).toContain('0');
  });

  it('should have navigation links to home and products', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const homeLink = compiled.querySelector('.btn-primary-orange') as HTMLAnchorElement;
    expect(homeLink).toBeTruthy();
    expect(homeLink.textContent).toContain('Back to Home');
    expect(homeLink.getAttribute('routerlink') || homeLink.getAttribute('href')).toBeTruthy();

    const productsLink = compiled.querySelector('.btn-secondary-outline') as HTMLAnchorElement;
    expect(productsLink).toBeTruthy();
    expect(productsLink.textContent).toContain('Explore Our Products');
  });

  it('should set 404 page title and noindex robots meta tag', () => {
    expect(titleService.getTitle()).toBe('404 - Page Not Found | Seyyon Connect');
    const robotsTag = metaService.getTag('name="robots"');
    expect(robotsTag?.content).toBe('noindex, nofollow');
  });
});
