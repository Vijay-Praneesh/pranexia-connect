import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<main class="auth-shell container py-4 py-md-5"><router-outlet /></main>`,
  styles: [`
    .auth-shell {
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
    }
  `],
})
export class AuthLayoutComponent {}
