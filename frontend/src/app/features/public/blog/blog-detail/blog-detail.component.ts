import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { BlogService } from '../blog.service';
import { Blog, AdjacentBlogs } from '../blog.model';

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
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

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
        this.titleService.setTitle('Article Not Found | Seyyon Connect');
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
    const fullTitle = `${blog.title} | Seyyon Connect`;
    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({ name: 'description', content: blog.excerpt });
    if (blog.tags?.length) {
      this.metaService.updateTag({ name: 'keywords', content: blog.tags.join(', ') });
    }

    // OpenGraph Tags
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: blog.excerpt });
    this.metaService.updateTag({ property: 'og:type', content: 'article' });
    this.metaService.updateTag({ property: 'og:url', content: typeof window !== 'undefined' ? window.location.href : '' });

    if (blog.image) {
      this.metaService.updateTag({ property: 'og:image', content: blog.image });
    }
  }

  copyShareLink(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Article link copied to clipboard!');
      });
    }
  }
}
