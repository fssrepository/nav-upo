import { Routes } from '@angular/router';
import { Document } from './document';

export const routes: Routes = [
  { path: '', redirectTo: 'documents', pathMatch: 'full' },
  { path: 'documents', component: Document }
];
