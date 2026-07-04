import { Routes } from '@angular/router';
import { UploadComponent } from './upload/upload.component';
import { InterviewComponent } from './interview/interview.component';
import { ResultsComponent } from './results/results.component';

export const routes: Routes = [
  { path: 'upload', component: UploadComponent },
  { path: 'interview', component: InterviewComponent },
  { path: 'results', component: ResultsComponent },
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { path: '**', redirectTo: '/upload' }
];
