import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Car Sales Management Login</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Authentication is required to access the Sales Leads section.</p>
          <p *ngIf="returnUrl">You were trying to access: {{returnUrl}}</p>
          <p *ngIf="errorMessage" class="error-message">{{errorMessage}}</p>
          <p *ngIf="token === ''" class="warning-message">
            Waiting for security token... <mat-icon>hourglass_empty</mat-icon>
          </p>
        </mat-card-content>
        <mat-card-actions>
          <form action="/Account/Login/ExternalLogin" method="post" (submit)="onSubmit($event)">
            <input name="__RequestVerificationToken" type="hidden" [value]="token" />
            <button
              mat-raised-button
              color="primary"
              name="provider"
              type="submit"
              [disabled]="token === ''"
              [value]="'https://login.windows.net/' + tenantId + '/'">
              <mat-icon>login</mat-icon>
              Login with Microsoft
            </button>
          </form>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f5f5f5;
    }
    .login-card {
      max-width: 400px;
      width: 100%;
      padding: 20px;
    }
    mat-card-actions {
      display: flex;
      justify-content: center;
    }
    .error-message {
      color: #f44336;
      font-weight: bold;
    }
    .warning-message {
      color: #ff9800;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class LoginComponent implements OnInit {
  token: string = '';
  returnUrl: string | null = null;
  errorMessage: string = '';
  tenantId: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Get the return URL from router state or query params
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras && navigation.extras.state) {
      this.returnUrl = navigation.extras.state['returnUrl'];
    } else {
      this.returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'] || null;
    }

    // Try to get tenant ID from window object
    try {
      // Use proper type assertion to avoid TypeScript errors
      const microsoft = (window as any)["Microsoft"];
      this.tenantId = microsoft?.Dynamic365?.Portal?.tenant || '561bca83-d7ad-49b5-999d-fd053a11b56a';
      console.log('Using tenant ID:', this.tenantId);
    } catch (error) {
      console.error('Error retrieving tenant ID:', error);
      this.tenantId = '561bca83-d7ad-49b5-999d-fd053a11b56a'; // Fallback to default
    }

    // Check if already authenticated and redirect if true
    this.authService.isAuthenticated.pipe(take(1)).subscribe(isAuthenticated => {
      if (isAuthenticated) {
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }
    });

    // Get token for the form
    this.authService.token.subscribe(token => {
      this.token = token;
      if (!token) {
        console.warn('No token received from auth service');
      }
    });

    // Check for token after a timeout to alert user if there's an issue
    setTimeout(() => {
      if (!this.token) {
        this.errorMessage = 'Unable to get security token. Please try refreshing the page.';
      }
    }, 5000);
  }

  onSubmit(event: Event): void {
    if (!this.token) {
      event.preventDefault();
      this.errorMessage = 'Cannot submit form without security token. Please refresh the page and try again.';
      console.error('Form submission blocked: No security token available');
      return;
    }

    // Let the form submit normally if we have a token
    console.log('Form submitting with token:', this.token.substring(0, 5) + '...');
  }
}
