import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../blog.service';
import { Blog, CategoryOption } from '../blog.model';
import { BlogCardComponent } from '../blog-card/blog-card.component';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, BlogCardComponent],
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.scss'],
})
export class BlogListComponent implements OnInit {
  private readonly blogService = inject(BlogService);
  private readonly seo = inject(SeoService);

  allBlogs: Blog[] = [];
  filteredBlogs: Blog[] = [];
  featuredBlog?: Blog;
  categories: CategoryOption[] = [];

  selectedCategory: string = 'all';
  searchQuery: string = '';
  isLoading: boolean = true;

  ngOnInit(): void {
    const pageTitle = 'Seyyon Connect Blog | WhatsApp Marketing & Customer Engagement';
    const metaDescription =
      'Explore practical guides on WhatsApp marketing, customer engagement, campaign management, templates, analytics and business communication.';
    const canonicalUrl = 'https://seyyonconnect.in/blogs';

    const organizationSchema = this.seo.getOrganizationSchema();
    const websiteSchema = this.seo.getWebSiteSchema();

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
          item: canonicalUrl,
        },
      ],
    };

    this.seo.updateSeo({
      title: pageTitle,
      description: metaDescription,
      canonicalUrl,
      ogTitle: pageTitle,
      ogDescription: metaDescription,
      ogUrl: canonicalUrl,
      schema: [organizationSchema, websiteSchema, breadcrumbSchema],
    });

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    this.blogService.getCategories().subscribe((cats) => {
      this.categories = cats;
    });

    this.blogService.getAllBlogs().subscribe((blogs) => {
      this.allBlogs = blogs;
      this.featuredBlog = blogs.find((b) => b.featured) ?? blogs[0];
      this.applyFilter();
      this.isLoading = false;
    });
  }

  onCategorySelect(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.applyFilter();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();

    this.filteredBlogs = this.allBlogs.filter((blog) => {
      const matchesCategory =
        this.selectedCategory === 'all' ||
        blog.category.toLowerCase() === this.selectedCategory.toLowerCase();

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
  }

  get nonFeaturedFilteredBlogs(): Blog[] {
    // If filter or search is active, show all matching results; otherwise exclude featured from the grid to avoid duplication
    if (this.selectedCategory !== 'all' || this.searchQuery.trim().length > 0) {
      return this.filteredBlogs;
    }
    return this.filteredBlogs.filter((b) => b.id !== this.featuredBlog?.id);
  }
}
