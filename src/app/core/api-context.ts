import { HttpContextToken } from '@angular/common/http';

export const SKIP_API_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

