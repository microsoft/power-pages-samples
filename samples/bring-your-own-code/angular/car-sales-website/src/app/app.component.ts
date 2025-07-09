import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthButtonComponent } from './components/auth-button/auth-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    CommonModule,
    AuthButtonComponent
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>      </button>
      <span>Car Sales Management</span>
      <span class="spacer"></span>
      <app-auth-button></app-auth-button>
    </mat-toolbar>

    <mat-sidenav-container>
      <mat-sidenav #sidenav mode="side" opened>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon>
            <span>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/inventory" routerLinkActive="active">
            <mat-icon>directions_car</mat-icon>
            <span>Inventory</span>
          </a>
          <a mat-list-item routerLink="/sales" routerLinkActive="active">
            <mat-icon>attach_money</mat-icon>
            <span>Sales</span>
          </a>
          <a mat-list-item routerLink="/customers" routerLinkActive="active">
            <mat-icon>people</mat-icon>
            <span>Customers</span>
          </a>          <a mat-list-item routerLink="/sales-leads" routerLinkActive="active">
            <mat-icon>person_add</mat-icon>
            <span>Sales Leads</span>
            <mat-icon class="lock-icon">lock</mat-icon>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }
    mat-sidenav-container {
      height: calc(100vh - 64px);
    }
    mat-sidenav {
      width: 250px;
    }
    .content {
      padding: 20px;
    }
    mat-nav-list a.active {
      background-color: rgba(0, 0, 0, 0.04);
    }
    mat-icon {
      margin-right: 8px;
      font-family: 'Material Icons' !important;
      display: inline-flex !important;
      vertical-align: middle;
    }
    .lock-icon {
      margin-left: auto;
      margin-right: 0;
      font-size: 16px;
      color: #f44336;
    }
  `]
})
export class AppComponent { }
