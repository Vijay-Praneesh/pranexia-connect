import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreloaderComponent } from './preloader.component';
import { PreloaderService } from '../../../core/services/preloader.service';

describe('PreloaderComponent', () => {
  let component: PreloaderComponent;
  let fixture: ComponentFixture<PreloaderComponent>;
  let preloaderService: PreloaderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreloaderComponent],
      providers: [PreloaderService],
    }).compileComponents();

    fixture = TestBed.createComponent(PreloaderComponent);
    component = fixture.componentInstance;
    preloaderService = TestBed.inject(PreloaderService);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not display overlay when not loading', () => {
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('.preloader-overlay');
    expect(overlay).toBeNull();
  });

  it('should display overlay with seyyon-favicon when loading is true', () => {
    preloaderService.isLoading.set(true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.preloader-overlay');
    expect(overlay).toBeTruthy();

    const favicon = fixture.nativeElement.querySelector('.preloader-favicon') as HTMLImageElement;
    expect(favicon).toBeTruthy();
    expect(favicon.src).toContain('assets/seyyon-favicon.png');

    const spinnerRing = fixture.nativeElement.querySelector('.spinner-ring');
    expect(spinnerRing).toBeTruthy();
  });
});
