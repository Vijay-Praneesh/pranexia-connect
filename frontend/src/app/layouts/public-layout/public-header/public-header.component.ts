import { Component, HostListener, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export interface NavItem {
  label: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './public-header.component.html',
  styleUrls: ['./public-header.component.scss'],
})
export class PublicHeaderComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private routerSub?: Subscription;
  private scrollListener?: (e: Event) => void;

  isScrolled = false;
  mobileMenuOpen = false;

  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/', exact: true },
    { label: 'About Us', route: '/about' },
    { label: 'Our Products', route: '/products' },
    { label: 'Pricings', route: '/pricing' },
    { label: 'Blogs', route: '/blogs' },
  ];

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileMenu();
      });

    if (typeof window !== 'undefined') {
      this.scrollListener = (e: Event) => {
        const target = e.target as HTMLElement;
        const top = target?.scrollTop !== undefined && target.scrollTop > 0 ? target.scrollTop : window.scrollY;
        this.isScrolled = top > 10;
      };
      window.addEventListener('scroll', this.scrollListener, true);
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.scrollListener && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollListener, true);
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 10;
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
