import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<main class="auth-shell"><router-outlet /></main>`,
  styles: [`
    .auth-shell {
      display: flex;
      min-height: 100vh;
      width: 100%;
      background-color: #f5f5f5;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
    }
  `],
})
export class AuthLayoutComponent {}
