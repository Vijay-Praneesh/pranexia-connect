import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { Blog, CategoryOption, AdjacentBlogs } from './blog.model';

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private readonly http = inject(HttpClient);
  private readonly dataUrl = 'assets/data/blogs.json';

  private blogsCache$?: Observable<Blog[]>;

  /**
   * Load and cache all blogs from assets/data/blogs.json
   */
  getAllBlogs(): Observable<Blog[]> {
    if (!this.blogsCache$) {
      this.blogsCache$ = this.http.get<Blog[]>(this.dataUrl).pipe(
        catchError((err) => {
          console.error('Failed to load blogs.json', err);
          return of([]);
        }),
        shareReplay(1)
      );
    }
    return this.blogsCache$;
  }

  /**
   * Find a blog by its URL slug
   */
  getBlogBySlug(slug: string): Observable<Blog | undefined> {
    return this.getAllBlogs().pipe(
      map((blogs) => blogs.find((b) => b.slug.toLowerCase() === slug.toLowerCase()))
    );
  }

  /**
   * Get the primary featured blog (or the first blog if none marked featured)
   */
  getFeaturedBlog(): Observable<Blog | undefined> {
    return this.getAllBlogs().pipe(
      map((blogs) => blogs.find((b) => b.featured) ?? blogs[0])
    );
  }

  /**
   * Extract dynamic category list with post counts
   */
  getCategories(): Observable<CategoryOption[]> {
    return this.getAllBlogs().pipe(
      map((blogs) => {
        const counts = new Map<string, number>();
        blogs.forEach((b) => {
          const cat = b.category || 'General';
          counts.set(cat, (counts.get(cat) ?? 0) + 1);
        });

        const categories: CategoryOption[] = [
          { id: 'all', label: 'All Articles', count: blogs.length },
        ];

        counts.forEach((count, cat) => {
          categories.push({
            id: cat,
            label: cat,
            count,
          });
        });

        return categories;
      })
    );
  }

  /**
   * Search and filter blogs by text query and category
   */
  searchBlogs(query: string = '', categoryId: string = 'all'): Observable<Blog[]> {
    const q = query.trim().toLowerCase();
    return this.getAllBlogs().pipe(
      map((blogs) => {
        return blogs.filter((blog) => {
          const matchesCategory =
            categoryId === 'all' ||
            blog.category.toLowerCase() === categoryId.toLowerCase();

          if (!matchesCategory) {
            return false;
          }

          if (!q) {
            return true;
          }

          const inTitle = blog.title.toLowerCase().includes(q);
          const inExcerpt = blog.excerpt.toLowerCase().includes(q);
          const inCategory = blog.category.toLowerCase().includes(q);
          const inTags = blog.tags?.some((t) => t.toLowerCase().includes(q));

          return inTitle || inExcerpt || inCategory || inTags;
        });
      })
    );
  }

  /**
   * Get up to `limit` related blogs:
   * 1. Same category first
   * 2. Exclude current article
   * 3. Fill remaining slots with other articles
   */
  getRelatedBlogs(currentSlug: string, category: string, limit: number = 3): Observable<Blog[]> {
    return this.getAllBlogs().pipe(
      map((blogs) => {
        const others = blogs.filter((b) => b.slug.toLowerCase() !== currentSlug.toLowerCase());
        const sameCategory = others.filter(
          (b) => b.category.toLowerCase() === category.toLowerCase()
        );
        const differentCategory = others.filter(
          (b) => b.category.toLowerCase() !== category.toLowerCase()
        );

        const combined = [...sameCategory, ...differentCategory];
        return combined.slice(0, limit);
      })
    );
  }

  /**
   * Get previous and next article links based on publication order
   */
  getAdjacentBlogs(currentSlug: string): Observable<AdjacentBlogs> {
    return this.getAllBlogs().pipe(
      map((blogs) => {
        const index = blogs.findIndex((b) => b.slug.toLowerCase() === currentSlug.toLowerCase());
        if (index === -1) {
          return {};
        }

        return {
          previous: index > 0 ? blogs[index - 1] : undefined,
          next: index < blogs.length - 1 ? blogs[index + 1] : undefined,
        };
      })
    );
  }
}
