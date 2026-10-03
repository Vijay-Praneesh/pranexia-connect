import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  RouteConfigLoadEnd,
  RouteConfigLoadStart,
  Router,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class PreloaderService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal<boolean>(false);
  readonly isFadingOut = signal<boolean>(false);
  readonly message = signal<string>('');

  private navStartTime = 0;
  private minDisplayTimeMs = 280; // Smooth minimal duration for visual polish
  private fadeOutDurationMs = 220; // Transition duration matching CSS
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private manualCounter = 0;

  constructor() {
    this.initRouterListener();
  }

  private initRouterListener(): void {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart || event instanceof RouteConfigLoadStart) {
        this.startNavigationLoading();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof RouteConfigLoadEnd
      ) {
        this.stopNavigationLoading();
      }
    });
  }

  private startNavigationLoading(): void {
    this.clearTimers();
    this.navStartTime = Date.now();
    this.isFadingOut.set(false);
    this.isLoading.set(true);
  }

  private stopNavigationLoading(): void {
    if (!this.isLoading() && this.manualCounter <= 0) {
      return;
    }

    const elapsed = Date.now() - this.navStartTime;
    const remainingTime = Math.max(0, this.minDisplayTimeMs - elapsed);

    this.clearTimers();

    this.hideTimer = setTimeout(() => {
      if (this.manualCounter > 0) {
        // Still manual tasks active
        return;
      }
      this.isFadingOut.set(true);

      this.fadeTimer = setTimeout(() => {
        this.isLoading.set(false);
        this.isFadingOut.set(false);
        this.message.set('');
      }, this.fadeOutDurationMs);
    }, remainingTime);
  }

  show(customMessage: string = ''): void {
    this.manualCounter++;
    this.clearTimers();
    this.navStartTime = Date.now();
    this.message.set(customMessage);
    this.isFadingOut.set(false);
    this.isLoading.set(true);
  }

  hide(force = false): void {
    if (force) {
      this.manualCounter = 0;
    } else if (this.manualCounter > 0) {
      this.manualCounter--;
    }

    if (this.manualCounter === 0) {
      this.stopNavigationLoading();
    }
  }

  private clearTimers(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }
}
