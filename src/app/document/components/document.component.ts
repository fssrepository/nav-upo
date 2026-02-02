import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { Observable, startWith, map } from 'rxjs';

interface DocumentItem {
  icon: string;
  ugyfel: string;
  description: string;
  datetime: string;
}

@Component({
  selector: 'app-document',
  template: `
    <div class="documents">
      <div class="top-row">
        <button mat-icon-button (click)="refresh()" aria-label="Refresh" [disabled]="loading">
          <mat-icon *ngIf="!loading">refresh</mat-icon>
          <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
        </button>

        <mat-form-field class="search" appearance="outline">
          <input matInput [formControl]="searchCtrl" [matAutocomplete]="auto" placeholder="Search ügyfél">
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="addChip($event.option.value)">
            <mat-option *ngFor="let option of filteredOptions$ | async" [value]="option">{{ option }}</mat-option>
          </mat-autocomplete>
        </mat-form-field>
      </div>

      <mat-chip-list class="chips">
        <mat-chip *ngFor="let chip of chips" [removable]="chip !== 'Ügyfél'" (removed)="remove(chip)">{{ chip }}</mat-chip>
      </mat-chip-list>

      <div class="table-container">
        <table mat-table [dataSource]="dataSource" class="mat-elevation-z1">

          <ng-container matColumnDef="icon">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let element"><mat-icon aria-hidden="true">{{element.icon}}</mat-icon></td>
          </ng-container>

          <ng-container matColumnDef="ugyfel">
            <th mat-header-cell *matHeaderCellDef>Ügyfél</th>
            <td mat-cell *matCellDef="let element">{{ element.ugyfel }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let element">{{ element.description }}</td>
          </ng-container>

          <ng-container matColumnDef="datetime">
            <th mat-header-cell *matHeaderCellDef class="datetime-header">Date</th>
            <td mat-cell *matCellDef="let element" class="datetime-cell">{{ element.datetime }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="paginator-row">
          <mat-paginator #paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons></mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .documents { padding: 1rem; }
      .top-row { display:flex; align-items:center; gap: 0.75rem; }
      .search { flex: 1; min-width: 220px; max-width: 600px; }
      .chips { margin-top: 0.75rem; display:flex; gap:0.5rem; }
      .table-container { margin-top: 1rem; }
      table { width: 100%; }
      .paginator-row { display:flex; justify-content:flex-end; padding-top: 0.5rem; }
      .datetime-cell { text-align: right; }
      .datetime-header { text-align: right; }
    `
  ]
})
export class DocumentComponent implements OnInit, AfterViewInit {
  searchCtrl = new FormControl('');
  options: string[] = ['Acme', 'Globex', 'Wayne Enterprises', 'Umbrella Corp', 'Initech'];
  filteredOptions$!: Observable<string[]>;

  chips: string[] = ['Ügyfél'];
  selectedFilters: string[] = [];

  documents: DocumentItem[] = [
    { icon: 'description', ugyfel: 'Acme', description: 'Contract agreement', datetime: '2026-02-01 10:00' },
    { icon: 'insert_drive_file', ugyfel: 'Globex', description: 'Invoice #1234', datetime: '2026-01-22 14:30' },
    { icon: 'description', ugyfel: 'Wayne Enterprises', description: 'NDA document', datetime: '2026-01-10 09:15' },
    { icon: 'insert_drive_file', ugyfel: 'Acme', description: 'Purchase order', datetime: '2026-02-02 11:05' },
    { icon: 'description', ugyfel: 'Initech', description: 'Support ticket', datetime: '2026-02-01 16:20' }
  ];

  dataSource = new MatTableDataSource<DocumentItem>(this.documents);
  displayedColumns: string[] = ['icon', 'ugyfel', 'description', 'datetime'];

  loading = false;

  @ViewChild('paginator') paginator!: MatPaginator;

  ngOnInit(): void {
    this.filteredOptions$ = this.searchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

  addChip(value: string) {
    if (!value) return;
    if (!this.chips.includes(value)) {
      this.chips.push(value);
    }
    if (value !== 'Ügyfél' && !this.selectedFilters.includes(value)) {
      this.selectedFilters.push(value);
    }
    this.searchCtrl.setValue('');
    this.applyFilter();
  }

  remove(chip: string) {
    if (chip === 'Ügyfél') return;
    const i = this.chips.indexOf(chip);
    if (i >= 0) this.chips.splice(i, 1);
    const j = this.selectedFilters.indexOf(chip);
    if (j >= 0) this.selectedFilters.splice(j, 1);
    this.applyFilter();
  }

  applyFilter() {
    if (this.selectedFilters.length === 0) {
      this.dataSource.data = this.documents;
    } else {
      this.dataSource.data = this.documents.filter(d => this.selectedFilters.includes(d.ugyfel));
    }
    if (this.paginator) this.paginator.firstPage();
  }

  refresh() {
    this.loading = true;
    setTimeout(() => {
      const now = new Date().toLocaleString();
      this.documents = this.documents.map(d => ({ ...d, datetime: now }));
      this.applyFilter();
      this.loading = false;
    }, 800);
  }
}

