import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DocumentComponent } from './components/document.component';

@NgModule({
  imports: [
    DocumentComponent,
    RouterModule.forChild([
      { path: '', component: DocumentComponent }
    ])
  ]
})
export class DocumentModule {}
