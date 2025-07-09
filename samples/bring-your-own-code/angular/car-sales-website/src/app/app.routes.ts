import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { LoginComponent } from './pages/auth/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'inventory',
    loadChildren: () => import('./pages/inventory/inventory.module').then(m => m.InventoryModule)
  },
  {
    path: 'sales',
    loadChildren: () => import('./pages/sales/sales.module').then(m => m.SalesModule)
  },
  {
    path: 'customers',
    loadChildren: () => import('./pages/customers/customers.module').then(m => m.CustomersModule)
  },
  {
    path: 'sales-leads',
    loadChildren: () => import('./pages/sales-leads/sales-leads.module').then(m => m.SalesLeadsModule),
    canActivate: [AuthGuard]  // Only the sales-leads route is protected
  },
  // Handle the external login callback
  { path: 'Account/Login/ExternalLogin', redirectTo: 'login' },
  { path: 'Account/Login/LogOff', redirectTo: 'login' },
  { path: '**', redirectTo: 'dashboard' }
];
