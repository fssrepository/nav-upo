import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { MENU_BADGES, MENU_BADGES_TOTAL } from './shared/menu-badges';
import { AlertService } from './shared/alert.service';
import { IssueSelectionService } from './shared/issue-selection.service';

interface MenuItemEntry {
  text: string;
  level?: number;
}

interface MenuPanelItem {
  title: string;
  items: Array<string | MenuItemEntry>;
}

type IssueLabel =
  | 'Adóügy'
  | 'Kormányablak'
  | 'Önkormányzat'
  | 'Bűnügy'
  | 'Egészségügy'
  | 'Munkaügy'
  | 'Jog'
  | 'Szolgáltatások';

type IssueCountMap = Record<IssueLabel, number>;

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatButtonModule, MatExpansionModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: '../_styles/app.scss'
})
export class App {
  public readonly alertService = inject(AlertService);
  private readonly issueSelection = inject(IssueSelectionService);

  protected getItemText(item: string | { text: string }) {
    return typeof item === 'string' ? item : item.text;
  }

  protected getItemLevel(item: string | { level?: number }) {
    if (typeof item === 'string') {
      return 0;
    }
    return item.level ?? 0;
  }

  protected activePopup: 'settings' | 'contact' | 'balance' | 'appointment' | 'centralHelp' | 'suspension' | 'userSettings' | 'addUser' | 'deleteUser' | null = null;
  protected readonly title = signal('e-kozig');
  protected readonly menuBadges = MENU_BADGES;
  protected readonly menuBadgeTotal = MENU_BADGES_TOTAL;
  protected showMobileMenu = false;
  protected showUserMenu = false;
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
      items: ['Számla kliens regisztráció (m2m/billingo)']
    },
    {
      title: 'Értesítő szabályok',
      items: [
        { text: 'A GDPR alapján a vállalkozónak is kell értesítőt küldeni a képviseleti műveletekről! (adatai változtak)', level: 0 },
        { text: 'A vállalkozó beállíthatja:', level: 0 },
        { text: 'Mely képviseleti műveletekről szeretne értesítést a vállalkozó a tárhelyén (e-mail)', level: 1 },
        { text: 'Mely képviseleti műveleteket szeretné el is fogadni a tárhelyén (e-mail), mielőtt aktiválódik (30 nap múlva automatikusan elfogadasra kerül)', level: 1 },
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

  protected readonly users = [
    {
      id: 'user-1',
      name: 'Farkas Anna',
      initials: 'FA',
      issueCounts: {
        'Adóügy': 2,
        'Kormányablak': 1,
        'Önkormányzat': 0,
        'Bűnügy': 3,
        'Egészségügy': 2,
        'Munkaügy': 1,
        'Jog': 4,
        'Szolgáltatások': 2
      } as IssueCountMap,
      counts: {
        appointments: 3,
        issues: 0,
        suspension: 1,
        centralHelp: 2,
        userSettings: 1,
        users: 4
      }
    },
    {
      id: 'user-2',
      name: 'Kiss Balázs',
      initials: 'KB',
      issueCounts: {
        'Adóügy': 1,
        'Kormányablak': 0,
        'Önkormányzat': 1,
        'Bűnügy': 0,
        'Egészségügy': 1,
        'Munkaügy': 0,
        'Jog': 2,
        'Szolgáltatások': 0
      } as IssueCountMap,
      counts: {
        appointments: 1,
        issues: 0,
        suspension: 0,
        centralHelp: 1,
        userSettings: 1,
        users: 4
      }
    },
    {
      id: 'user-3',
      name: 'Nagy Eszter',
      initials: 'NE',
      issueCounts: {
        'Adóügy': 3,
        'Kormányablak': 2,
        'Önkormányzat': 1,
        'Bűnügy': 2,
        'Egészségügy': 0,
        'Munkaügy': 1,
        'Jog': 1,
        'Szolgáltatások': 3
      } as IssueCountMap,
      counts: {
        appointments: 5,
        issues: 0,
        suspension: 2,
        centralHelp: 1,
        userSettings: 1,
        users: 4
      }
    }
  ];
  protected activeUserId = 'user-1';

  protected readonly appointmentsByUser: Record<string, Array<{
    id: string;
    place: string;
    address: string;
    datetime: string;
    mapUrl: string;
  }>> = {
    'user-1': [
      {
        id: 'app-1',
        place: 'NAV Kiemelt Ügyfélszolgálat',
        address: '1054 Budapest, Széchenyi u. 2.',
        datetime: '2026.02.18. 10:30',
        mapUrl: 'https://maps.google.com/?q=1054+Budapest+Sz%C3%A9chenyi+u.+2'
      },
      {
        id: 'app-2',
        place: 'Kormányablak - XIII. kerület',
        address: '1133 Budapest, Váci út 62-64.',
        datetime: '2026.02.26. 09:15',
        mapUrl: 'https://maps.google.com/?q=1133+Budapest+V%C3%A1ci+%C3%BAt+62-64'
      },
      {
        id: 'app-3',
        place: 'Önkormányzat - Ügyféltér',
        address: '1146 Budapest, Thököly út 11.',
        datetime: '2026.03.05. 14:00',
        mapUrl: 'https://maps.google.com/?q=1146+Budapest+Th%C3%B6k%C3%B6ly+%C3%BAt+11'
      }
    ],
    'user-2': [
      {
        id: 'app-4',
        place: 'Kormányablak - XVI. kerület',
        address: '1163 Budapest, Veres Péter út 112.',
        datetime: '2026.02.20. 08:45',
        mapUrl: 'https://maps.google.com/?q=1163+Budapest+Veres+P%C3%A9ter+%C3%BAt+112'
      },
      {
        id: 'app-5',
        place: 'NAV Ügyfélszolgálat',
        address: '1081 Budapest, József körút 18.',
        datetime: '2026.02.27. 11:00',
        mapUrl: 'https://maps.google.com/?q=1081+Budapest+J%C3%B3zsef+k%C3%B6r%C3%BAt+18'
      }
    ],
    'user-3': [
      {
        id: 'app-6',
        place: 'Önkormányzat - Ügyféltér',
        address: '1123 Budapest, Alkotás u. 1.',
        datetime: '2026.02.19. 13:20',
        mapUrl: 'https://maps.google.com/?q=1123+Budapest+Alkot%C3%A1s+u.+1'
      },
      {
        id: 'app-7',
        place: 'Kormányablak - XI. kerület',
        address: '1117 Budapest, Fehérvári út 52.',
        datetime: '2026.02.25. 09:00',
        mapUrl: 'https://maps.google.com/?q=1117+Budapest+Feh%C3%A9rv%C3%A1ri+%C3%BAt+52'
      },
      {
        id: 'app-8',
        place: 'NAV Kiemelt Ügyfélszolgálat',
        address: '1054 Budapest, Széchenyi u. 2.',
        datetime: '2026.03.03. 15:10',
        mapUrl: 'https://maps.google.com/?q=1054+Budapest+Sz%C3%A9chenyi+u.+2'
      },
      {
        id: 'app-9',
        place: 'Egészségügyi Központ',
        address: '1037 Budapest, Bécsi út 96.',
        datetime: '2026.03.10. 10:00',
        mapUrl: 'https://maps.google.com/?q=1037+Budapest+B%C3%A9csi+%C3%BAt+96'
      }
    ]
  };

  protected selectedAppointmentId = this.appointmentsByUser['user-1'][0].id;
  protected readonly appointmentCategories = [
    'Adóügy',
    'Kormányablak',
    'Önkormányzat',
    'Bűnügy',
    'Egészségügy',
    'Munkaügy',
    'Jog',
    'Szolgáltatások'
  ];
  protected selectedAppointmentCategory = this.appointmentCategories[0];

  protected readonly issueGroups: Array<{ label: IssueLabel; detail: string }> = [
    { label: 'Adóügy', detail: 'NAV' },
    { label: 'Kormányablak', detail: 'Okmány stb.' },
    { label: 'Önkormányzat', detail: 'Helyi ügyek' },
    { label: 'Bűnügy', detail: 'Rendőrség' },
    { label: 'Egészségügy', detail: 'EESZT' },
    { label: 'Munkaügy', detail: 'Munkaügyi Központ' },
    { label: 'Jog', detail: 'Bíróság, Ügyészség, Fogyasztóvédelem, Igazságügy, Köztársasági Elnök' },
    { label: 'Szolgáltatások', detail: 'Közüzemi számlák, BKV bérletek, autópálya matrica, parkolás' }
  ];
  protected issueQuery = '';
  protected usersOpen = true;
  protected appointmentsOpen = false;
  protected issuesOpen = false;

  constructor() {
    this.userBadgeCount = this.getUserMenuTotal();
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

  openUserPopup(type: 'appointment' | 'centralHelp' | 'suspension' | 'userSettings' | 'addUser' | 'deleteUser') {
    this.activePopup = type;
    this.showUserMenu = false;
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
      case 'appointment':
        return 'Időpontfoglalás';
      case 'centralHelp':
        return 'Központi segítség';
      case 'suspension':
        return 'Felhasználó Felfüggesztése';
      case 'userSettings':
        return 'Beállítások';
      case 'addUser':
        return 'Felhasználó hozzáadása';
      case 'deleteUser':
        return 'Törlés';
      default:
        return '';
    }
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  toggleUserSection(section: 'users' | 'appointments') {
    if (section === 'users') {
      this.usersOpen = !this.usersOpen;
      return;
    }
    this.appointmentsOpen = !this.appointmentsOpen;
    if (this.appointmentsOpen) {
      this.issuesOpen = false;
    }
  }

  toggleIssueSection() {
    this.issuesOpen = !this.issuesOpen;
    if (this.issuesOpen) {
      this.appointmentsOpen = false;
    }
  }

  getIssueTotal() {
    return Object.values(this.activeUser.issueCounts ?? {}).reduce((sum, value) => sum + value, 0);
  }

  getIssueCount(label: IssueLabel) {
    return this.activeUser.issueCounts?.[label] ?? 0;
  }

  onUserSelect() {
    this.toggleUserMenu();
  }

  get activeUser() {
    return this.users.find(user => user.id === this.activeUserId) ?? this.users[0];
  }

  get otherUsers() {
    return this.users.filter(user => user.id !== this.activeUserId);
  }

  selectUser(userId: string) {
    this.activeUserId = userId;
    this.userBadgeCount = this.getUserMenuTotal();
    const firstAppointment = this.userAppointments[0];
    if (firstAppointment) {
      this.selectedAppointmentId = firstAppointment.id;
    }
  }

  getUserMenuTotal() {
    const counts = this.activeUser.counts;
    return Object.entries(counts).reduce((sum, [key, value]) => {
      if (key === 'issues') {
        return sum + this.getIssueTotal();
      }
      return sum + value;
    }, 0);
  }

  getUserMenuCount(key: keyof typeof this.activeUser.counts) {
    if (key === 'issues') {
      return this.getIssueTotal();
    }
    return this.activeUser.counts[key] ?? 0;
  }

  selectAppointment(appointmentId: string) {
    this.selectedAppointmentId = appointmentId;
    this.selectedAppointmentCategory = this.getCategoryForAppointment();
  }

  get userAppointments() {
    return this.appointmentsByUser[this.activeUserId] ?? [];
  }

  get selectedAppointment() {
    const appointments = this.userAppointments;
    return appointments.find(item => item.id === this.selectedAppointmentId) ?? appointments[0];
  }

  private getCategoryForAppointment() {
    const place = this.selectedAppointment.place.toLowerCase();
    if (place.includes('nav')) {
      return 'Adóügy';
    }
    if (place.includes('kormányablak')) {
      return 'Kormányablak';
    }
    if (place.includes('önkormányzat')) {
      return 'Önkormányzat';
    }
    return this.appointmentCategories[0];
  }

  setAppointmentCategory(category: string) {
    this.selectedAppointmentCategory = category;
  }

  onIssueQueryChange(value: string) {
    this.issueQuery = value;
    const match = this.issueGroups.find(item => item.label.toLowerCase() === value.toLowerCase());
    if (match) {
      this.issueSelection.setIssue(match.detail);
    }
  }

  openMapLink(url: string, openNewTab: boolean) {
    if (openNewTab) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    window.location.href = url;
  }

  openMapLinkSmart(url: string) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    this.openMapLink(url, !isMobile);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.showMobileMenu && !target.closest('.mobile-menu-panel-global') && !target.closest('.mobile-menu-btn-global')) {
      this.showMobileMenu = false;
    }
    if (this.showUserMenu && !target.closest('.user-menu-panel') && !target.closest('.user-selector-btn-global')) {
      this.showUserMenu = false;
    }
  }
}
