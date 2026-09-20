export interface BlogAuthor {
  name: string;
  role: string;
  avatar?: string;
}

export interface BlogParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface BlogHeadingBlock {
  type: 'heading';
  level: 2 | 3 | 4;
  text: string;
}

export interface BlogListBlock {
  type: 'list';
  items: string[];
}

export interface BlogImageBlock {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
}

export interface BlogQuoteBlock {
  type: 'quote';
  text: string;
  author?: string;
}

export interface BlogHighlightBlock {
  type: 'highlight';
  text: string;
}

export interface BlogLinkBlock {
  type: 'link';
  text: string;
  url: string;
  external?: boolean;
}

export type BlogContentBlock =
  | BlogParagraphBlock
  | BlogHeadingBlock
  | BlogListBlock
  | BlogImageBlock
  | BlogQuoteBlock
  | BlogHighlightBlock
  | BlogLinkBlock;

export interface Blog {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: BlogAuthor;
  publishedDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
  tags: string[];
  content: BlogContentBlock[];
}

export interface CategoryOption {
  id: string;
  label: string;
  count: number;
}

export interface AdjacentBlogs {
  previous?: Blog;
  next?: Blog;
}
