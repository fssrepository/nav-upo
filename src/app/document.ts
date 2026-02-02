import { Component } from '@angular/core';

@Component({
  selector: 'app-document',
  standalone: true,
  template: `
    <div class="documents">
      <h2>Documents</h2>
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
export class Document {}
