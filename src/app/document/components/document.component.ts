import { Component, OnInit, ViewChild, AfterViewInit, HostListener, inject, ChangeDetectorRef, ElementRef, OnDestroy, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Observable, startWith, map } from 'rxjs';
import { DocumentItem, DocumentItemDetail } from '../models/document-item.interface';
import { DocumentService } from '../services/document.service';

@Component({
  selector: 'app-document',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  styleUrls: ['../../../_styles/_document.scss'],
  templateUrl: './document.component.html',

})
export class DocumentComponent implements OnInit, AfterViewInit, OnDestroy {
  private documentService = inject(DocumentService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private filtersScrollLeft = 0;
  private scrollLockInterval: any = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private mobilePageSize = 10;
  private mobileVisibleCount = 10;
  private mobileFilteredDocuments: DocumentItem[] = [];
  private lastFilteredDocuments: DocumentItem[] = [];
  private resizeHandler?: () => void;
  private pullStartY = 0;
  private pullDistanceInternal = 0;
  private pullEligible = false;
  private pullTouchMoveHandler?: (event: TouchEvent) => void;
  private pullTouchStartHandler?: (event: TouchEvent) => void;
  private pullTouchEndHandler?: () => void;
  private readonly pullThreshold = 64;
  private readonly pullMax = 120;
  private readonly pullStartThreshold = 8;
  private filterUpdateTimer: number | null = null;

  isMobileView = window.innerWidth <= 768;
  mobileLoadingMore = false;
  pullActive = false;
  pullRefreshing = false;

  searchCtrl = new FormControl('');
  searchResults: DocumentItem[] = [];
  showSearchPanel = false;
  userBadgeCount = 1;

  // Ugyfél dropdown controls
  ugyfelCtrl = new FormControl('');
  filteredUgyfels$!: Observable<string[]>;
  showUgyfelPanel = false;

  // Form dropdown controls
  formCtrl = new FormControl('');
  filteredForms$!: Observable<string[]>;
  showFormPanel = false;
  selectedForms: string[] = [];

  // Status dropdown controls
  statusCtrl = new FormControl('');
  filteredStatuses$!: Observable<string[]>;
  showStatusPanel = false;
  selectedStatuses: string[] = [];

  // Date range controls
  dateFromCtrl = new FormControl<Date | null>(null);
  dateToCtrl = new FormControl<Date | null>(null);
  showDatePanel = false;

  // Unread filter
  showUnreadOnly = false;

  // selected filter chips (üg yfels)
  chips: string[] = [];
  selectedFilters: string[] = [];

  // Search chips for AND filtering
  searchTerms: string[] = [];

  documents: DocumentItem[] = [];

  dataSource = new MatTableDataSource<DocumentItem>(this.documents);
  displayedColumns: string[] = ['icon', 'name', 'description', 'status', 'datetime'];

  loading = false;
  selectedItem: DocumentItem | null = null;
  expandedItemIds: Set<string> = new Set();

  @ViewChild('paginator') paginator!: MatPaginator;
  @ViewChild('tableScrollSentinel') tableScrollSentinel!: ElementRef<HTMLElement>;
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Load documents from service
    this.documentService.getDocuments().subscribe(docs => {
      const forms = this.documentService.getFormNames();
      const names = this.documentService.getNames();
      const statuses = this.documentService.getStatuses();
      
      this.documents = docs.map((doc, index) => {
        const items = (doc.items || []).map((item, i) => ({
          ...item,
          type: item.type || forms[(index + i) % forms.length],
          formName: item.formName || item.type || forms[(index + i) % forms.length],
          name: doc.ugyfel,
          status: item.status || statuses[(index + i) % statuses.length]
        })).sort((a, b) => {
          const da = this.parseDateTime(a.datetime);
          const db = this.parseDateTime(b.datetime);
          return db.getTime() - da.getTime();
        });
        
        // Latest item is first (items are sorted descending)
        const latestItem = items[0];
        
        return {
          ...doc,
          id: `doc-${index}`,
          name: doc.ugyfel,
          status: latestItem?.status || statuses[index % statuses.length],
          formName: latestItem?.formName || doc.formName,
          datetime: latestItem?.datetime || doc.datetime,
          items
        };
      });
      this.sortDocuments();
      this.applyFilter();
    });

    // Setup search bar to show results panel based on searchKey
    this.searchCtrl.valueChanges.pipe(
      startWith('')
    ).subscribe(value => {
      const query = (value || '').trim();
      if (query.length > 0) {
        this.searchResults = this.documentService.searchDocuments(query);
        this.showSearchPanel = this.searchResults.length > 0;
      } else {
        this.searchResults = [];
        this.showSearchPanel = false;
      }
    });

    // setup ügyfél autocomplete filtered stream (exclude already selected)
    this.filteredUgyfels$ = this.ugyfelCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterUgyfel(value || ''))
    );

    this.filteredForms$ = this.formCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterForm(value || ''))
    );

    this.filteredStatuses$ = this.statusCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterStatus(value || ''))
    );
  }

  ngAfterViewInit(): void {
    this.setupResizeListener();
    this.updateViewMode(window.innerWidth);
    this.updatePaginatorMode();
    this.setupMobileIntersectionObserver();
    this.setupPullToRefresh();
  }

  ngOnDestroy(): void {
    this.teardownMobileIntersectionObserver();
    this.teardownResizeListener();
    this.teardownPullToRefresh();
    if (this.filterUpdateTimer !== null) {
      window.clearTimeout(this.filterUpdateTimer);
      this.filterUpdateTimer = null;
    }
  }

  private _filterUgyfel(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.documentService.getNames()
      .filter(option => option.toLowerCase().includes(filterValue))
      .filter(option => !this.selectedFilters.includes(option));
  }

  private _filterForm(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.documentService.getFormNames()
      .filter(option => option.toLowerCase().includes(filterValue))
      .filter(option => !this.selectedForms.includes(option));
  }

  private _filterStatus(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.documentService.getStatuses()
      .filter(option => option.toLowerCase().includes(filterValue))
      .filter(option => !this.selectedStatuses.includes(option));
  }

  selectSearchResult(doc: DocumentItem) {
    // Close search panel and find the processed version from this.documents
    this.showSearchPanel = false;
    this.searchCtrl.setValue('', { emitEvent: false });
    
    // Find the matching document from the processed list using ugyfel as the unique key
    const processedDoc = this.documents.find(d => d.ugyfel === doc.ugyfel);
    
    if (processedDoc) {
      // Use selectTableRow to ensure consistent processing
      this.selectTableRow(processedDoc);
    } else {
      this.expandedItemIds.clear();
    }
  }

  selectTableRow(doc: DocumentItem) {
    // Sort items by datetime descending
    const sortedDoc = {
      ...doc,
      items: (doc.items || []).slice().sort((a, b) => {
        const da = this.parseDateTime(a.datetime);
        const db = this.parseDateTime(b.datetime);
        return db.getTime() - da.getTime();
      })
    };
    this.selectedItem = sortedDoc;
    this.expandedItemIds.clear();
  }

  getItemType(item: DocumentItemDetail, index: number): string {
    if (item.type) return item.type;
    const forms = this.documentService.getFormNames();
    return forms[index % forms.length];
  }

  closeDetailView() {
    this.selectedItem = null;
    this.expandedItemIds.clear();
    setTimeout(() => {
      this.updatePaginatorMode();
      if (!this.isMobileView && this.paginator) {
        this.paginator.length = this.dataSource.data.length;
        this.paginator.firstPage();
      }
    });
  }

  toggleAccordion(itemId: string) {
    if (this.expandedItemIds.has(itemId)) {
      this.expandedItemIds.delete(itemId);
    } else {
      this.expandedItemIds.add(itemId);
    }
  }

  generateUgyszam(item: DocumentItem): string {
    const baseNum = Math.abs(item.ugyfel.charCodeAt(0) * 1000 + ((item.formName || '').length * 10));
    return `UGY-${String(baseNum % 999999).padStart(6, '0')}`;
  }

  getStatusIcon(status: string): string {
    const statusIconMap: { [key: string]: string } = {
      'Beküldve': 'send',
      'Iktatva': 'folder',
      'Tájékoztató': 'info',
      'Hiba': 'error',
      'Lezárva': 'check_circle'
    };
    return statusIconMap[status] || 'description';
  }

  hasKiegeszitesAttachment(item: DocumentItemDetail): boolean {
    return !!(item.attachments && item.attachments.length > 0 && 
      item.attachments.some(att => att.name && typeof att.name === 'string' && att.name.toLowerCase().includes('kiegészítés')));
  }

  getKiegeszitesName(item: DocumentItemDetail): string {
    const kiegeszites = item.attachments?.find(att => 
      att.name && typeof att.name === 'string' && att.name.toLowerCase().includes('kiegészítés')
    );
    return kiegeszites?.name || '';
  }

  hasFormTypeAttachment(item: DocumentItemDetail): boolean {
    return !!(item.attachments && item.attachments.length > 0 && 
      item.attachments.some(att => 
        att.name && typeof att.name === 'string' && !att.name.toLowerCase().includes('kiegészítés')
      ));
  }

  onReply() {
    window.alert('Új üzenet küldése az ügyhöz! (pl. e-papir)');
  }

  onManualClose() {
    window.alert('Manuális Lezárás');
  }

  onViewAttachment() {
    window.alert('Dokumentum megnyitasa Onya-ban (pl. javitasra)!');
  }

  onDownloadAttachment() {
    window.alert('A dokumentum letoltese! (pl. pdf fájl)');
  }

  filterBySearch() {
    const query = (this.searchCtrl.value || '').trim();
    if (!query) return;

    // Add as search chip if not already present
    if (!this.searchTerms.includes(query)) {
      this.searchTerms.push(query);
    }

    // Clear input and close search panel
    this.searchCtrl.setValue('', { emitEvent: false });
    this.showSearchPanel = false;

    // Apply filter with all search terms
    this.applyFilter();
  }

  removeSearchTerm(term: string) {
    const i = this.searchTerms.indexOf(term);
    if (i >= 0) {
      this.searchTerms.splice(i, 1);
      this.applyFilter();
    }
  }

  addChip(value: string) {
    if (!value) return;
    if (!this.chips.includes(value)) {
      this.chips.push(value);
    }
    if (!this.selectedFilters.includes(value)) {
      this.selectedFilters.push(value);
    }
    this.searchCtrl.setValue('');
    this.applyFilter();
  }

  selectUgyfel(value: string) {
    // select from the dropdown's autocomplete
    if (!value) return;
    if (!this.selectedFilters.includes(value)) {
      this.selectedFilters.push(value);
    }
    // keep the panel open for multiple selection; clear input
    this.ugyfelCtrl.setValue('');
    this.applyFilter();
  }

  private smoothScroll(container: HTMLElement, target: number, duration = 240) {
    const start = container.scrollLeft;
    const delta = target - start;
    const startTime = performance.now();
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      container.scrollLeft = start + delta * ease(progress);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  private lockFiltersScroll(container: HTMLElement, target: number) {
    let frames = 0;
    const lock = () => {
      container.scrollLeft = target;
      if (frames++ < 8) {
        requestAnimationFrame(lock);
      }
    };
    lock();
    setTimeout(() => (container.scrollLeft = target), 100);
    setTimeout(() => (container.scrollLeft = target), 200);
    setTimeout(() => (container.scrollLeft = target), 350);
  }

  private startScrollLock() {
    const container = document.querySelector('.filters') as HTMLElement | null;
    if (!container) return;
    const target = this.filtersScrollLeft;
    
    // Clear any existing lock
    if (this.scrollLockInterval) {
      clearInterval(this.scrollLockInterval);
    }
    
    // Continuously lock scroll position while panel is open
    this.scrollLockInterval = setInterval(() => {
      if (container.scrollLeft !== target) {
        container.scrollLeft = target;
      }
    }, 16);
  }

  private stopScrollLock() {
    if (this.scrollLockInterval) {
      clearInterval(this.scrollLockInterval);
      this.scrollLockInterval = null;
    }
  }

  private restoreFiltersScroll() {
    const container = document.querySelector('.filters') as HTMLElement | null;
    if (!container) return;
    const target = this.filtersScrollLeft;
    container.scrollLeft = target;
    requestAnimationFrame(() => (container.scrollLeft = target));
    setTimeout(() => (container.scrollLeft = target), 50);
    setTimeout(() => (container.scrollLeft = target), 150);
  }

  private positionPanel(btnSelector: string, panelSelector: string) {
    // Only position panels on mobile (width <= 768px)
    if (window.innerWidth > 768) return;
    
    const btn = document.querySelector(btnSelector) as HTMLElement | null;
    const panel = document.querySelector(panelSelector) as HTMLElement | null;
    if (!btn || !panel) return;

    const btnRect = btn.getBoundingClientRect();
    panel.style.top = `${btnRect.bottom + 6}px`;
    panel.style.left = '16px';
  }

  private scrollFiltersToButton(selector: string, openPanel: () => void, focusSelector?: string) {
    // Only scroll on mobile (width <= 768px)
    if (window.innerWidth > 768) {
      openPanel();
      if (focusSelector) {
        setTimeout(() => {
          const el = document.querySelector(focusSelector) as HTMLInputElement | null;
          el?.focus({ preventScroll: true });
        }, 50);
      }
      return;
    }

    const btn = document.querySelector(selector) as HTMLElement | null;
    const container = document.querySelector('.filters') as HTMLElement | null;
    if (!btn || !container) {
      openPanel();
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const targetScroll = container.scrollLeft + (btnRect.left - containerRect.left) - 20;
    this.filtersScrollLeft = targetScroll;

    this.smoothScroll(container, targetScroll, 240);

    setTimeout(() => {
      openPanel();
      this.cdr.detectChanges();
      this.lockFiltersScroll(container, targetScroll);
      this.startScrollLock();
      if (focusSelector) {
        setTimeout(() => {
          const el = document.querySelector(focusSelector) as HTMLInputElement | null;
          el?.focus({ preventScroll: true });
        }, 50);
      }
      // Position panel based on button location
      setTimeout(() => this.positionPanel(selector, focusSelector?.replace(' input', '') || ''), 10);
    }, 260);
  }

  toggleUgyfelPanel() {
    if (this.showUgyfelPanel) {
      this.showUgyfelPanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
      return;
    }

    this.scrollFiltersToButton('.ugyfel-btn', () => {
      this.showUgyfelPanel = true;
      setTimeout(() => this.positionPanel('.ugyfel-btn', '.ugyfel-panel'), 20);
    }, '.ugyfeld-search input');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    
    // Check if click is inside a Material datepicker overlay
    const isDatepickerClick = target.closest('.mat-datepicker-popup, .mat-datepicker-content, .mat-calendar');
    
    const ugyfelWrapper = document.querySelector('.ugyfel-wrapper');
    if (this.showUgyfelPanel && ugyfelWrapper && !ugyfelWrapper.contains(target)) {
      this.showUgyfelPanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
    }
    const dateWrapper = document.querySelector('.date-wrapper');
    if (this.showDatePanel && dateWrapper && !dateWrapper.contains(target) && !isDatepickerClick) {
      this.showDatePanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
    }
    const formWrapper = document.querySelector('.form-wrapper');
    if (this.showFormPanel && formWrapper && !formWrapper.contains(target)) {
      this.showFormPanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
    }
    const statusWrapper = document.querySelector('.status-wrapper');
    if (this.showStatusPanel && statusWrapper && !statusWrapper.contains(target)) {
      this.showStatusPanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
    }
  }

  toggleDatePanel() {
    if (this.showDatePanel) {
      this.showDatePanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
      return;
    }

    this.scrollFiltersToButton('.date-btn', () => {
      this.showDatePanel = true;
      setTimeout(() => this.positionPanel('.date-btn', '.date-panel'), 20);
    });
  }

  toggleFormPanel() {
    if (this.showFormPanel) {
      this.showFormPanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
      return;
    }

    this.scrollFiltersToButton('.form-btn', () => {
      this.showFormPanel = true;
      setTimeout(() => this.positionPanel('.form-btn', '.form-panel'), 20);
    }, '.form-search input');
  }

  onUserSelect() {
    window.alert('Felhasználó választása.');
  }

  toggleUnreadFilter() {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.applyFilter();
  }

  onDateChange() {
    this.applyFilter();
  }

  removeDate(which: 'from' | 'to') {
    if (which === 'from') {
      this.dateFromCtrl.setValue(null);
    } else {
      this.dateToCtrl.setValue(null);
    }
    this.applyFilter();
  }

  get dateLabel(): string {
    const from = this.dateFromCtrl.value;
    const to = this.dateToCtrl.value;
    if (!from && !to) return '';
    const fromText = from ? this.formatShortDate(from) : '...';
    const toText = to ? this.formatShortDate(to) : '...';
    return `${fromText} - ${toText}`;
  }

  selectForm(value: string) {
    if (!value) return;
    if (!this.selectedForms.includes(value)) {
      this.selectedForms.push(value);
    }
    this.formCtrl.setValue('');
    this.applyFilter();
  }

  removeForm(value: string) {
    const i = this.selectedForms.indexOf(value);
    if (i >= 0) this.selectedForms.splice(i, 1);
    this.formCtrl.updateValueAndValidity();
    this.applyFilter();
  }

  selectStatus(value: string) {
    if (!value) return;
    if (!this.selectedStatuses.includes(value)) {
      this.selectedStatuses.push(value);
    }
    this.statusCtrl.setValue('');
    this.applyFilter();
  }

  removeStatus(value: string) {
    const i = this.selectedStatuses.indexOf(value);
    if (i >= 0) this.selectedStatuses.splice(i, 1);
    this.statusCtrl.updateValueAndValidity();
    this.applyFilter();
  }

  toggleStatusPanel() {
    if (this.showStatusPanel) {
      this.showStatusPanel = false;
      this.stopScrollLock();
      this.restoreFiltersScroll();
      return;
    }

    this.scrollFiltersToButton('.status-btn', () => {
      this.showStatusPanel = true;
      setTimeout(() => this.positionPanel('.status-btn', '.status-panel'), 20);
    }, '.status-search input');
  }

  remove(chip: string) {
    if (chip === 'Ügyfél') return;
    const i = this.chips.indexOf(chip);
    if (i >= 0) this.chips.splice(i, 1);
    const j = this.selectedFilters.indexOf(chip);
    if (j >= 0) this.selectedFilters.splice(j, 1);
    this.ugyfelCtrl.updateValueAndValidity();
    this.applyFilter();
  }

  applyFilter() {
    // Simulate a short loading delay and refresh the table view
    this.loading = true;
    this.mobileLoadingMore = false;
    if (this.filterUpdateTimer !== null) {
      window.clearTimeout(this.filterUpdateTimer);
    }
    this.cdr.markForCheck();

    const update = () => {
      const sorted = this.documents.slice().sort((a, b) => {
        const da = this.parseDateTime(a.datetime);
        const db = this.parseDateTime(b.datetime);
        return db.getTime() - da.getTime();
      });

      let filtered = sorted;

      // Apply search terms with AND logic
      if (this.searchTerms.length > 0) {
        filtered = filtered.filter(d => 
          this.searchTerms.every(term => d.searchKey.includes(term.toLowerCase()))
        );
      }

      if (this.selectedFilters.length > 0) {
        filtered = filtered.filter(d => this.selectedFilters.includes(d.ugyfel));
      }

      if (this.selectedForms.length > 0) {
        filtered = filtered.filter(d => 
          d.items && d.items.some(item => 
            item.formName && this.selectedForms.includes(item.formName)
          )
        );
      }

      if (this.selectedStatuses.length > 0) {
        filtered = filtered.filter(d => 
          this.selectedStatuses.includes(d.status || '')
        );
      }

      if (this.showUnreadOnly) {
        filtered = filtered.filter(d => d.unread === true);
      }

      const from = this.dateFromCtrl.value;
      const to = this.dateToCtrl.value;
      if (from || to) {
        const fromTime = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() : null;
        const toTime = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime() : null;
        filtered = filtered.filter(d => {
          const dt = this.parseDateTime(d.datetime).getTime();
          if (fromTime !== null && dt < fromTime) return false;
          if (toTime !== null && dt > toTime) return false;
          return true;
        });
      }

      this.lastFilteredDocuments = filtered;
      this.updateTableData(filtered);
      this.refreshMobileObserver();
      this.loading = false;
      this.filterUpdateTimer = null;
      this.cdr.markForCheck();
    };
    // Debounce / simulate server delay
    this.filterUpdateTimer = window.setTimeout(update, 400);
  }

  private setupResizeListener() {
    this.teardownResizeListener();
    this.resizeHandler = () => this.updateViewMode(window.innerWidth);
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  private teardownResizeListener() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.resizeHandler = undefined;
  }

  private updateViewMode(width: number) {
    const nextIsMobile = width <= 768;
    if (nextIsMobile === this.isMobileView) return;

    this.isMobileView = nextIsMobile;
    this.updatePaginatorMode();
    if (this.lastFilteredDocuments.length > 0) {
      this.updateTableData(this.lastFilteredDocuments);
    }
    this.refreshMobileObserver();
    if (!this.isMobileView) {
      this.resetPullState();
    }
    this.cdr.markForCheck();
  }

  refresh() {
    // Simulate reloading table content without mutating item timestamps
    this.loading = true;
    setTimeout(() => {
      // Reapply sort & filters to refresh the table view
      this.sortDocuments();
      this.applyFilter();
      this.loading = false;
      this.pullRefreshing = false;
      this.resetPullState();
      this.cdr.markForCheck();
    }, 500);
  }

  get pullDistance(): number {
    return this.pullRefreshing ? this.pullThreshold : this.pullDistanceInternal;
  }

  get pullProgress(): number {
    if (this.pullRefreshing) return 100;
    return Math.min(100, Math.round((this.pullDistanceInternal / this.pullThreshold) * 100));
  }

  private setupPullToRefresh() {
    if (!this.tableContainer) return;
    this.teardownPullToRefresh();

    const container = this.tableContainer.nativeElement;
    this.pullTouchStartHandler = (event: TouchEvent) => {
      if (!this.isMobileView || this.loading || this.mobileLoadingMore || this.pullRefreshing) return;
      this.pullEligible = container.scrollTop === 0;
      this.pullStartY = event.touches[0]?.clientY ?? 0;
      this.pullDistanceInternal = 0;
      this.cdr.markForCheck();
    };

    this.pullTouchMoveHandler = (event: TouchEvent) => {
      if (!this.pullEligible || this.pullRefreshing) return;
      if (container.scrollTop > 0) {
        this.resetPullState();
        return;
      }
      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - this.pullStartY;
      if (delta <= 0) {
        if (this.pullActive) {
          this.resetPullState();
        }
        return;
      }

      if (!this.pullActive && delta < this.pullStartThreshold) {
        return;
      }

      this.pullActive = true;
      this.pullDistanceInternal = Math.min(this.pullMax, delta);
      if (this.pullDistanceInternal > 0) {
        event.preventDefault();
      }
      this.cdr.markForCheck();
    };

    this.pullTouchEndHandler = () => {
      if (!this.pullActive) {
        this.pullEligible = false;
        return;
      }
      if (this.pullDistanceInternal >= this.pullThreshold) {
        this.pullRefreshing = true;
        this.cdr.markForCheck();
        this.refresh();
      } else {
        this.resetPullState();
      }
      this.pullEligible = false;
      this.cdr.markForCheck();
    };

    container.addEventListener('touchstart', this.pullTouchStartHandler, { passive: true });
    container.addEventListener('touchmove', this.pullTouchMoveHandler, { passive: false });
    container.addEventListener('touchend', this.pullTouchEndHandler, { passive: true });
    container.addEventListener('touchcancel', this.pullTouchEndHandler, { passive: true });
  }

  private teardownPullToRefresh() {
    if (!this.tableContainer) return;
    const container = this.tableContainer.nativeElement;
    if (this.pullTouchStartHandler) {
      container.removeEventListener('touchstart', this.pullTouchStartHandler);
    }
    if (this.pullTouchMoveHandler) {
      container.removeEventListener('touchmove', this.pullTouchMoveHandler);
    }
    if (this.pullTouchEndHandler) {
      container.removeEventListener('touchend', this.pullTouchEndHandler);
      container.removeEventListener('touchcancel', this.pullTouchEndHandler);
    }
    this.pullTouchStartHandler = undefined;
    this.pullTouchMoveHandler = undefined;
    this.pullTouchEndHandler = undefined;
  }

  private resetPullState() {
    this.pullActive = false;
    this.pullDistanceInternal = 0;
    this.pullEligible = false;
  }

  private updateTableData(filtered: DocumentItem[]) {
    if (this.isMobileView) {
      this.mobileFilteredDocuments = filtered;
      this.mobileVisibleCount = Math.min(this.mobilePageSize, filtered.length);
      this.dataSource.data = filtered.slice(0, this.mobileVisibleCount);
    } else {
      this.dataSource.data = filtered;
      if (this.paginator) this.paginator.firstPage();
    }
  }

  private refreshMobileObserver() {
    if (!this.isMobileView || !this.tableScrollSentinel || !this.tableContainer) return;
    if (!this.intersectionObserver) {
      this.setupMobileIntersectionObserver();
      return;
    }

    const sentinel = this.tableScrollSentinel.nativeElement;
    this.intersectionObserver.unobserve(sentinel);
    this.intersectionObserver.observe(sentinel);

    const root = this.tableContainer.nativeElement;
    const sentinelRect = sentinel.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const isVisible = sentinelRect.top <= rootRect.bottom && sentinelRect.bottom >= rootRect.top;
    if (isVisible) {
      this.loadMoreMobileItems();
    }
  }

  private updatePaginatorMode() {
    if (this.isMobileView) {
      this.dataSource.paginator = null;
    } else if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  private setupMobileIntersectionObserver() {
    if (!this.isMobileView || !this.tableScrollSentinel || !this.tableContainer) return;
    this.teardownMobileIntersectionObserver();

    const root = this.tableContainer.nativeElement;
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.loadMoreMobileItems();
        }
      },
      { root, rootMargin: '0px 0px 200px 0px', threshold: 0.01 }
    );

    this.intersectionObserver.observe(this.tableScrollSentinel.nativeElement);
  }

  private teardownMobileIntersectionObserver() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  private loadMoreMobileItems() {
    console.log("load items 1");
    if (!this.isMobileView || this.loading || this.mobileLoadingMore) return;
    console.log("load items 2");
    if (this.mobileVisibleCount >= this.mobileFilteredDocuments.length) return;
    console.log("load items 3");

    this.zone.run(() => {
      console.log("load items 33");
      console.debug('[documents] loadMoreMobileItems start', {
        visible: this.mobileVisibleCount,
        total: this.mobileFilteredDocuments.length
      });
      this.mobileLoadingMore = true;
      this.cdr.markForCheck();
    });

    console.log("load items 4");

    const nextCount = Math.min(this.mobileVisibleCount + this.mobilePageSize, this.mobileFilteredDocuments.length);

    setTimeout(() => {
      console.log("load items 5");
      this.zone.run(() => {
        console.debug('[documents] loadMoreMobileItems apply', {
          nextVisible: nextCount,
          total: this.mobileFilteredDocuments.length
        });
        this.mobileVisibleCount = nextCount;
        this.dataSource.data = this.mobileFilteredDocuments.slice(0, this.mobileVisibleCount);
        this.mobileLoadingMore = false;
        this.refreshMobileObserver();
        this.cdr.markForCheck();
      });
    }, 1200);
  }

  private sortDocuments() {
    this.documents.sort((a, b) => {
      const da = this.parseDateTime(a.datetime);
      const db = this.parseDateTime(b.datetime);
      return db.getTime() - da.getTime();
    });
  }

  formatDate(s: string): string {
    if (!s) return '';
    const d = this.parseDateTime(s);
    if (isNaN(d.getTime())) return s;
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) {
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    if (sameYear) {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(d.getDate()).padStart(2,'0')} ${monthNames[d.getMonth()]}`;
    }
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  formatShortDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private parseDateTime(s: string): Date {
    // expected format: YYYY-MM-DD HH:mm or variants
    const parts = s.trim().split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      const [y, m, d] = datePart.split('-').map(n => Number(n));
      const [hh, mm] = timePart.split(':').map(n => Number(n));
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        return new Date(y, m-1, d, hh || 0, mm || 0);
      }
    }
    const dt = new Date(s);
    return dt;
  }

}
