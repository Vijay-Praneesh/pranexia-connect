import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PublicHeaderComponent } from './public-header/public-header.component';
import { PublicFooterComponent } from './public-footer/public-footer.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <div #publicShell class="public-shell">
      <app-public-header />
      <main class="public-main-content">
        <router-outlet />
      </main>
      <app-public-footer />
    </div>
  `,
  styleUrls: ['./public-layout.component.scss'],
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('publicShell', { static: true }) publicShell?: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private routerSub?: Subscription;

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.scrollToTop();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  @HostListener('click', ['$event'])
  onElementClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && (anchor.hasAttribute('routerLink') || anchor.getAttribute('href')?.startsWith('/'))) {
      // Small timeout ensures router navigation and DOM update align cleanly
      setTimeout(() => this.scrollToTop(), 0);
    }
  }

  scrollToTop(): void {
    if (this.publicShell?.nativeElement) {
      this.publicShell.nativeElement.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }
}
