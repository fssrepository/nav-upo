import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MENU_BADGES, MENU_BADGES_TOTAL } from './shared/menu-badges';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: '../_styles/app.scss'
})
export class App {
  protected readonly title = signal('e-kozig');
  protected readonly menuBadges = MENU_BADGES;
  protected readonly menuBadgeTotal = MENU_BADGES_TOTAL;
  protected showMobileMenu = false;
  protected userBadgeCount = 1;

  constructor() {
    // Listen for menu toggle events from child components
    window.addEventListener('toggleMobileMenu', () => {
      this.toggleMobileMenu();
    });
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  onUserSelect() {
    window.alert('Felhasználó választása (pl. vállalkozó, képviselő, szimpla személy) és vagy Szervezet választása esetén a szűrőfeltételek és a menüpontok módosulhatnak!');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.showMobileMenu && !target.closest('.mobile-menu-panel-global') && !target.closest('.mobile-menu-btn-global')) {
      this.showMobileMenu = false;
    }
  }
}
