import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-footer.component.html',
  styleUrls: ['./public-footer.component.scss'],
})
export class PublicFooterComponent {
  readonly currentYear = new Date().getFullYear();

  newsletterEmail = '';
  newsletterSubmitted = false;

  onNewsletterSubmit(): void {
    if (this.newsletterEmail && this.newsletterEmail.includes('@')) {
      this.newsletterSubmitted = true;
      setTimeout(() => {
        this.newsletterSubmitted = false;
        this.newsletterEmail = '';
      }, 5000);
    }
  }

  scrollToTop(): void {
    if (typeof document !== 'undefined') {
      const targets = [
        document.querySelector('.public-shell'),
        document.querySelector('.public-main-content'),
        document.documentElement,
        document.body,
      ];

      targets.forEach((target) => {
        if (target && target.scrollTop !== undefined) {
          target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }
}
