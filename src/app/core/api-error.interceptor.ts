import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SKIP_API_ERROR_TOAST } from './api-context';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/api/auth/login')) {
        authService.clearSession();
        router.navigate(['/login']);
      }

      if (!req.context.get(SKIP_API_ERROR_TOAST)) {
        toastService.error(resolveErrorMessage(error));
      }
      return throwError(() => error);
    })
  );
};

function resolveErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Có lỗi không xác định. Vui lòng thử lại.';
  }

  const body = error.error as { message?: string; errors?: string[] | Record<string, string[]> } | null;
  if (body?.message) {
    return body.message;
  }

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors[0];
  }

  if (body?.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) {
    const errorsMap = body.errors as Record<string, string[]>;
    const firstKey = Object.keys(errorsMap)[0];
    const firstGroup = firstKey ? errorsMap[firstKey] : undefined;
    if (Array.isArray(firstGroup) && firstGroup.length) {
      return firstGroup[0];
    }
  }

  switch (error.status) {
    case 0:
      return 'Không kết nối được API server.';
    case 400:
      return 'Dữ liệu gửi lên không hợp lệ.';
    case 401:
      return 'Phiên đăng nhập hết hạn hoặc không hợp lệ.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy dữ liệu yêu cầu.';
    case 500:
      return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.';
    default:
      return `Có lỗi xảy ra (${error.status}).`;
  }
}

