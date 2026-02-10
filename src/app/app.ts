import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MENU_BADGES, MENU_BADGES_TOTAL } from './shared/menu-badges';

interface MenuItemEntry {
  text: string;
  level?: number;
}

interface MenuPanelItem {
  title: string;
  items: Array<string | MenuItemEntry>;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatButtonModule, MatExpansionModule],
  templateUrl: './app.html',
  styleUrl: '../_styles/app.scss'
})
export class App {

  protected getItemText(item: string | { text: string }) {
    return typeof item === 'string' ? item : item.text;
  }

  protected getItemLevel(item: string | { level?: number }) {
    if (typeof item === 'string') {
      return 0;
    }
    return item.level ?? 0;
  }

  protected activePopup: 'settings' | 'contact' | 'balance' | null = null;
  protected readonly title = signal('e-kozig');
  protected readonly menuBadges = MENU_BADGES;
  protected readonly menuBadgeTotal = MENU_BADGES_TOTAL;
  protected showMobileMenu = false;
  protected userBadgeCount = 1;
  protected readonly contactContent = 'Chat, video, telefon link';
  protected readonly balanceValue = '-200e Ft';
  protected readonly settingsPanels: MenuPanelItem[] = [
    {
      title: 'Adozoi adatok',
      items: ['Adóhatósági igazolások']
    },
    {
      title: 'Foglalkoztatasi adatok',
      items: ['Foglalkoztatói bejelentések, lekérdezések', 'Keresetkimutatás, Járulékadatok']
    },
    {
      title: 'Képviseletek',
      items: [
        { text: 'Lista az aktuális képviseletekről és azok jogosultságairól (törlés gomb a végén)', level: 0 },
        { text: 'Képviselt hozzáadása gomb a könyvelő oldalán', level: 0 },
        { text: 'Képviselet meghatalmazas kerő urlap betöltése (jogosultsag + onkormanyzat - hipa checkbox)', level: 1 },
        { text: 'Könyvelő beküldi a kérést (kitölti az ürlapot), amit a vállalkozó a saját tárhelyén elfogad', level: 1 },
        { text: 'Ezzel ki lehet küszöbölni, hogy a vállalkozó kényszerből megossza az ügyfélkapus jelszavát a könyvelővel!', level: 1 }
      ]
    },
    {
      title: 'Szamlak',
      items: ['Számla kliens regisztráció (m2m/billingo) - mikor kuldjon emailt']
    },
    {
      title: 'Értesítő szabályok',
      items: [
        { text: 'A GDPR alapján a vállalkozónak is kell értesítőt küldeni a képviseleti műveletekről. (adatai változtak)', level: 0 },
        { text: 'A vállalkozó beállíthatja:', level: 0 },
        { text: 'Mely képviseleti műveletekről szeretne értesítést a vállalkozó', level: 1 },
        { text: 'Mely képviseleti műveleteket szeretné el is fogadni, mielőtt aktiválódik (30 nap múlva automatikusan elfogadasra kerül)', level: 1 },
        { text: 'A tárhelyre érkező üzenet formája, amikor A könyvelő benyújtja az adóbevallást és a NAV feldolgozza azt:', level: 0 },
        { text: 'A könyvelőnek visszaküld egy technikai vagy hibaüzenetet a szokásos módon', level: 1 },
        { text: 'A vállalkozónak rövid, közérthető tájékoztatást küld', level: 1 },
        { text: '„A 2021-es KATA adóbevallásban hibát észleltünk, itt tekintheti meg.”', level: 2 },
        { text: '„Az Ön nevében új adóbevallás került benyújtásra. Kérjük, tekintse át az Ügyfélportál [megadott menüpontjában]. Ha mindent rendben talál, fogadja el; ha nem reagál 30 napon belül, a bevallást automatikusan elfogadottnak tekintjük.”', level: 2 },
        { text: '„Az adóbevallás sikeresen benyújtásra került.”', level: 2 }
      ]
    }
  ];
  protected readonly balancePanels = [
    {
      title: 'Befizetés'
    },
    {
      title: 'Adónaptár',
      items: ['Esedekes bevallasok, hianyzo bevallasok']
    },
    {
      title: 'Köztartozások',
      subpanels: [
        { title: 'Fizetési tájékoztatók' },
        { title: 'Pótléklevezetés' },
        { title: 'Adóteljesítmény' },
        { title: 'Köztartozásmentes adózói adatbázis (KOMA)' },
        { title: 'Egyéb végrehajtható köztartozások' }
      ]
    },
    {
      title: 'Adóraktár',
      subpanels: [
        { title: 'Adóraktári készlet + mozgás' },
        { title: 'Jövedéki biztosíték szabad keret' }
      ]
    }
  ];

  constructor() {
    // Listen for menu toggle events from child components
    window.addEventListener('toggleMobileMenu', () => {
      this.toggleMobileMenu();
    });
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  openPopup(type: 'settings' | 'contact' | 'balance') {
    this.activePopup = type;
    this.showMobileMenu = false;
  }

  closePopup() {
    this.activePopup = null;
  }

  getPopupTitle() {
    switch (this.activePopup) {
      case 'settings':
        return 'Beállítások';
      case 'contact':
        return 'Kapcsolat';
      case 'balance':
        return 'Egyenleg';
      default:
        return '';
    }
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
