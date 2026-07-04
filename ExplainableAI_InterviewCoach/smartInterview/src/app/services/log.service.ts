import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppLogEntry {
  timestamp: Date;
  source: 'UPLOAD' | 'INTERVIEW' | 'RESULTS' | 'VOICE' | 'SYSTEM';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private readonly maxEntries = 200;
  private _entries: AppLogEntry[] = [];
  private _entries$ = new BehaviorSubject<AppLogEntry[]>([]);

  entries$ = this._entries$.asObservable();

  log(entry: Omit<AppLogEntry, 'timestamp'>) {
    const full: AppLogEntry = { ...entry, timestamp: new Date() };
    this._entries = [full, ...this._entries].slice(0, this.maxEntries);
    this._entries$.next(this._entries);
  }

  clear() {
    this._entries = [];
    this._entries$.next(this._entries);
  }
}


