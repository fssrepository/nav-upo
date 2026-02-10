import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IssueSelectionService {
  readonly selectedIssue = signal<string | null>(null);

  setIssue(issue: string | null): void {
    this.selectedIssue.set(issue);
  }
}
