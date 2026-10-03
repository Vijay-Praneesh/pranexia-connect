import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreloaderService } from '../../../core/services/preloader.service';

@Component({
  selector: 'app-preloader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss',
})
export class PreloaderComponent {
  readonly preloaderService = inject(PreloaderService);
}
