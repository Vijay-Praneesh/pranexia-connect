import { Injectable } from '@angular/core';

import { AuthSession } from '../models/auth.model';

const SESSION_KEY = 'pranexia-connect.auth-session';

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  read(): AuthSession | null {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AuthSession;
    } catch {
      this.clear();
      return null;
    }
  }

  write(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  }
}
