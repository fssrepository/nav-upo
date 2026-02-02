import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="documents">
      <h2>Dokumentumok</h2>
      <p>This is the "Documents" page — your documents will appear here.</p>
    </div>
  `,
  styles: [
    `
      .documents {
        padding: 1rem;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.02);
      }
    `
  ]
})
export class DocumentComponent {}
