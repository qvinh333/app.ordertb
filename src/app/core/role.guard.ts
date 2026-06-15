import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { UserRole } from './models';

export const roleGuard = (roles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const currentUser = authService.currentUser();

    if (currentUser && roles.includes(currentUser.role)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
};

