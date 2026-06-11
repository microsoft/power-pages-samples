import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  username: string;
  firstName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string>('');

  constructor() {
    this.checkUserAuthentication();
    this.getTokenDeferred();
  }

  private checkUserAuthentication(): void {
    const microsoftDynamic = (window as any)['Microsoft']?.Dynamic365?.Portal?.User;

    if (microsoftDynamic && microsoftDynamic.userName) {
      this.currentUserSubject.next({
        username: microsoftDynamic.userName || '',
        firstName: microsoftDynamic.firstName || '',
        lastName: microsoftDynamic.lastName || ''
      });
    } else {
      this.currentUserSubject.next(null);
    }
  }

  private async getTokenDeferred(): Promise<void> {
    try {
      const token = await this.fetchAntiForgeryToken();
      if (token) {
        this.tokenSubject.next(token);
        return;
      }
    } catch (e) {
      console.error('Error retrieving token:', e);
    }
  }

  private async fetchAntiForgeryToken(): Promise<string> {
    try {
      const tokenEndpoint = "/_layout/tokenhtml";

      const response = await fetch(tokenEndpoint, {});

      if (response.status !== 200) {
        throw new Error(`Failed to fetch token: ${response.status}`);
      }

      const tokenResponse = await response.text();
      console.log(`Token Response = ${tokenResponse}`);
      const valueString = 'value="';
      const terminalString = '" />';
      const valueIndex = tokenResponse.indexOf(valueString);

      if (valueIndex === -1) {
        throw new Error('Token not found in response');
      }

      const requestVerificationToken = tokenResponse.substring(
        valueIndex + valueString.length,
        tokenResponse.indexOf(terminalString, valueIndex)
      );

      return requestVerificationToken || '';
    } catch (error) {
      console.warn('[Impersonation] Failed to fetch anti-forgery token:', error);
      return '';
    }
  }

  public get currentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  public get isAuthenticated(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.currentUser.subscribe(user => {
        observer.next(!!user && user.username !== '');
        observer.complete();
      });
    });
  }

  public get token(): Observable<string> {
    return this.tokenSubject.asObservable();
  }

  public logout(): void {
    window.location.href = "/Account/Login/LogOff?returnUrl=%2F";
  }
}
