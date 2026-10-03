import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BlogService } from '../blog.service';
import { Blog, AdjacentBlogs } from '../blog.model';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss'],
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogService = inject(BlogService);
  private readonly seoService = inject(SeoService);

  private routeSub?: Subscription;

  blog?: Blog;
  relatedBlogs: Blog[] = [];
  adjacentBlogs: AdjacentBlogs = {};
  isLoading: boolean = true;
  notFound: boolean = false;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadBlog(slug);
      } else {
        this.notFound = true;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadBlog(slug: string): void {
    this.isLoading = true;
    this.notFound = false;

    this.blogService.getBlogBySlug(slug).subscribe((blog) => {
      this.isLoading = false;
      if (!blog) {
        this.notFound = true;
        this.seoService.updateSeo({
          title: 'Article Not Found | Seyyon Connect',
          description: "We couldn't find the article you're looking for.",
          robots: 'noindex, nofollow',
        });
        return;
      }

      this.blog = blog;
      this.updateSeo(blog);

      // Load related blogs
      this.blogService.getRelatedBlogs(blog.slug, blog.category, 3).subscribe((related) => {
        this.relatedBlogs = related;
      });

      // Load prev / next adjacent blogs
      this.blogService.getAdjacentBlogs(blog.slug).subscribe((adjacent) => {
        this.adjacentBlogs = adjacent;
      });

      // Scroll to top smoothly
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  private updateSeo(blog: Blog): void {
    const pageTitle = `${blog.title} | Seyyon Connect`;
    const canonicalUrl = `https://seyyonconnect.in/blogs/${blog.slug}`;
    const imageUrl = blog.image
      ? (blog.image.startsWith('http') ? blog.image : `https://seyyonconnect.in/${blog.image}`)
      : 'https://seyyonconnect.in/assets/meta-tag.png';

    const organizationSchema = this.seoService.getOrganizationSchema();
    const websiteSchema = this.seoService.getWebSiteSchema();

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://seyyonconnect.in/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blogs',
          item: 'https://seyyonconnect.in/blogs',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: blog.title,
          item: canonicalUrl,
        },
      ],
    };

    const blogPostingSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: blog.title,
      description: blog.excerpt,
      image: imageUrl,
      url: canonicalUrl,
      author: {
        '@type': 'Organization',
        name: blog.author?.name || 'Seyyon Connect Team',
      },
      publisher: {
        '@id': 'https://seyyonconnect.in/#organization',
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl,
      },
    };

    this.seoService.updateSeo({
      title: pageTitle,
      description: blog.excerpt,
      canonicalUrl,
      ogTitle: pageTitle,
      ogDescription: blog.excerpt,
      ogUrl: canonicalUrl,
      ogType: 'article',
      ogImage: imageUrl,
      ogImageAlt: blog.title,
      schema: [organizationSchema, websiteSchema, breadcrumbSchema, blogPostingSchema],
    });
  }


  copyShareLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Article link copied to clipboard!');
      });
    }
  }
}
