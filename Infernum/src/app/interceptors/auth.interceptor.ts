import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('infernum_token');
    const router = inject(Router);

    let authReq = req;
    if (token) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError((error) => {
            if (error.status === 401) {
                localStorage.removeItem('infernum_current_user_v3');
                localStorage.removeItem('infernum_token');
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
