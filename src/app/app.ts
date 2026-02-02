import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: '../_styles/app.scss'
})
export class App {
  protected readonly title = signal('nav-upo');
}
