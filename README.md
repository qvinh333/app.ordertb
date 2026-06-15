# APP.Sale Frontend

Angular application for Taobao order sales management, built to match requirements in `required.md` and backend API contract in `API.README.md`.

## Features

- JWT login/logout flow with route guard and role-based access (`ADMIN`, `SELLER`)
- Global toast notifications for success/error/info events
- Global API error interceptor with friendly messages and 401 session reset
- Dashboard page:
  - Order status statistics
  - Revenue/profit statistics
  - Orders grouped by date
- Order management:
  - List with filtering and pagination
  - Create/update order
  - Update order status
  - Soft delete order
- User management (Admin only):
  - List/search/filter role
  - Create/update/delete users
- Pagination parser supports common backend response shapes (`items`, `records`, `totalCount`, `meta`, `pagination`, snake_case keys)

## Tech Stack

- Angular 22 (standalone components)
- Angular Router
- Reactive Forms
- HttpClient + auth interceptor

## Project Structure

```text
src/app/
  core/
    auth.service.ts
    auth.guard.ts
    role.guard.ts
    auth.interceptor.ts
    dashboard.service.ts
    orders.service.ts
    users.service.ts
    models.ts
  features/
    auth/login.page.ts
    layout/app-layout.component.ts
    dashboard/dashboard.page.ts
    orders/orders.page.ts
    orders/order-form.page.ts
    users/users.page.ts
```

## API Configuration

Default API base URL is set in `src/app/core/constants.ts`:

```ts
export const API_BASE_URL = 'https://localhost:5163';
```

If your backend runs at a different URL, update this value.

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Test & Build

```bash
npm test
npm run build
```

## Notes

- All API payloads are parsed with support for standard wrapper format:
  - `{ success, message, data }`
- UI labels are Vietnamese and align with business flow in `required.md`.
- This frontend expects backend endpoints from `API.README.md` to be available.
