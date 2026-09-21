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
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: #fbf4ee;
      background-image: radial-gradient(at 0% 0%, rgba(249, 102, 20, 0.08) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(246, 135, 73, 0.06) 0px, transparent 50%);
      margin: 0;
      padding: 0;
      font-family: 'Outfit', Inter, system-ui, sans-serif;
      scrollbar-width: thin;

      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(203, 213, 225, 0.8);
        border-radius: 4px;
      }
    }
  `],
})
export class AuthLayoutComponent {}
