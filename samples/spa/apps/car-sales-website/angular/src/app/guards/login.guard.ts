import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { map, Observable, take } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

@Injectable({
    providedIn: 'root'
})
export class LoginGuard implements CanActivate {

    constructor(private authService: AuthService, private router: Router) { }

    canActivate(): Observable<boolean> {
        return this.authService.isAuthenticated.pipe(
            take(1),
            map(isAuthenticated => {
                if (isAuthenticated) {
                    // If already authenticated, redirect to dashboard
                    this.router.navigate(['/dashboard']);
                    return false;
                }
                return true;
            })
        );
    }
}
