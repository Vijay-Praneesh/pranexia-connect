import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly meta = inject(Meta);

  ngOnInit(): void {
    // Configure SEO for 404 page (do not index)
    this.seoService.updateSeo({
      title: '404 - Page Not Found | Seyyon Connect',
      description:
        "The page you're looking for doesn't exist or may have been moved. Return to Seyyon Connect and explore our customer engagement platform.",
      robots: 'noindex, nofollow',
    });
  }
}
