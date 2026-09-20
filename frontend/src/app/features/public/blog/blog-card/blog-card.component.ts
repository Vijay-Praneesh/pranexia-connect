import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Blog } from '../blog.model';

@Component({
  selector: 'app-blog-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-card.component.html',
  styleUrls: ['./blog-card.component.scss'],
})
export class BlogCardComponent {
  @Input({ required: true }) blog!: Blog;
}
