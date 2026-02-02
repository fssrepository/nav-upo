import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DocumentItem } from '../models/document-item.interface';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private documents: DocumentItem[] = [
    { icon: 'description', ugyfel: 'Acme', description: 'Contract agreement', datetime: '2026-02-01 10:00', unread: true, searchKey: 'acme contract agreement' },
    { icon: 'insert_drive_file', ugyfel: 'Globex', description: 'Invoice #1234', datetime: '2026-01-22 14:30', unread: false, searchKey: 'globex invoice 1234' },
    { icon: 'description', ugyfel: 'Wayne Enterprises', description: 'NDA document', datetime: '2025-12-10 09:15', unread: false, searchKey: 'wayne enterprises nda document' },
    { icon: 'insert_drive_file', ugyfel: 'Acme', description: 'Purchase order', datetime: '2026-02-02 11:05', unread: true, searchKey: 'acme purchase order' },
    { icon: 'description', ugyfel: 'Initech', description: 'Support ticket', datetime: '2026-02-01 16:20', unread: false, searchKey: 'initech support ticket' },
    { icon: 'description', ugyfel: 'Umbrella Corp', description: 'Safety report', datetime: '2025-11-03 08:30', unread: false, searchKey: 'umbrella corp safety report' },
    { icon: 'insert_drive_file', ugyfel: 'Stark Industries', description: 'Tech spec', datetime: '2026-01-05 12:00', unread: true, searchKey: 'stark industries tech spec' },
    { icon: 'description', ugyfel: 'Wayne Enterprises', description: 'Board minutes', datetime: '2026-01-30 09:45', unread: false, searchKey: 'wayne enterprises board minutes' },
    { icon: 'insert_drive_file', ugyfel: 'Acme', description: 'Invoice #4321', datetime: '2026-02-02 09:20', unread: true, searchKey: 'acme invoice 4321' },
    { icon: 'description', ugyfel: 'Globex', description: 'Contract addendum', datetime: '2026-01-15 15:00', unread: false, searchKey: 'globex contract addendum' },
    { icon: 'insert_drive_file', ugyfel: 'Initech', description: 'Audit log', datetime: '2026-01-28 11:10', unread: false, searchKey: 'initech audit log' },
    { icon: 'description', ugyfel: 'Wayne Enterprises', description: 'Legal memo', datetime: '2024-06-20 10:00', unread: false, searchKey: 'wayne enterprises legal memo' }
  ];

  getDocuments(): Observable<DocumentItem[]> {
    return of(this.documents);
  }

  searchDocuments(query: string): DocumentItem[] {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return this.documents.filter(doc => doc.searchKey.includes(q)).slice(0, 8);
  }
}
