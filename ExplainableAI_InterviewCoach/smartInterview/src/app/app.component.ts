import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, NavigationEnd, Router } from '@angular/router';
import { AsyncPipe, DatePipe, NgClass, NgIf, NgForOf } from '@angular/common';
import { filter } from 'rxjs/operators';
import { LogService, AppLogEntry } from './services/log.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AsyncPipe, DatePipe, NgClass, NgIf, NgForOf],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Interview Prep AI';
  currentStep = 1;
   logs$: Observable<AppLogEntry[]>;

  constructor(private router: Router, private logService: LogService) {
    this.logs$ = this.logService.entries$;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.urlAfterRedirects.includes('/upload')) {
        this.currentStep = 1;
      } else if (event.urlAfterRedirects.includes('/interview')) {
        this.currentStep = 2;
      } else if (event.urlAfterRedirects.includes('/results')) {
        this.currentStep = 3;
      }

      this.logService.log({
        source: 'SYSTEM',
        level: 'info',
        message: `Navigated to ${event.urlAfterRedirects}`
      });
    });
  }

  goTo(path: string) {
    this.router.navigate([path]);
  }

  clearLogs() {
    this.logService.clear();
  }
}