import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<main class="container-fluid py-4"><router-outlet /></main>`,
})
export class AppLayoutComponent {}
