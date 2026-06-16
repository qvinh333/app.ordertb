import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { LoginPage } from './features/auth/login.page';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { CustomersPage } from './features/customers/customers.page';
import { CurrencyRatesPage } from './features/currency-rates/currency-rates.page';
import { AppLayoutComponent } from './features/layout/app-layout.component';
import { OrdersPage } from './features/orders/orders.page';
import { ProductsPage } from './features/products/products.page';
import { UsersPage } from './features/users/users.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage, canActivate: [guestGuard] },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPage },
      { path: 'orders', component: OrdersPage },
      { path: 'products', component: ProductsPage },
      { path: 'customers', component: CustomersPage },
      { path: 'currency-rates', component: CurrencyRatesPage },
      { path: 'users', component: UsersPage, canActivate: [roleGuard(['ADMIN'])] }
    ]
  },
  { path: '**', redirectTo: '' }
];
