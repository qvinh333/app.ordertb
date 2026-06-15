import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { USER_ROLE_LABELS } from '../../core/constants';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <header class="topbar">
        <div class="brand">
          <img src="app-logo.svg" alt="Logo" class="brand-logo" />
          <h1>Quản lý bán hàng</h1>
        </div>

        <div class="topbar-right">
          @if (authService.currentUser(); as user) {
            <span class="user-chip">{{ user.fullName }} - {{ roleLabels[user.role] }}</span>
          }
          <button type="button" (click)="onLogout()">
            <span class="btn-content">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
              <span>Đăng xuất</span>
            </span>
          </button>
        </div>
      </header>

      <div class="body" [class.sidebar-collapsed]="sidebarCollapsed">
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
          <button
            type="button"
            class="sidebar-toggle"
            (click)="toggleSidebar()"
            [attr.aria-label]="sidebarCollapsed ? 'Mở menu' : 'Thu gọn menu'"
            [attr.title]="sidebarCollapsed ? 'Mở menu' : 'Thu gọn menu'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              @if (sidebarCollapsed) {
                <path d="M9 18l6-6-6-6" />
              } @else {
                <path d="M15 18l-6-6 6-6" />
              }
            </svg>
          </button>

          <a routerLink="/dashboard" routerLinkActive="active">
            <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></svg></span>
            <span class="label">Bảng điều khiển</span>
          </a>
          <a routerLink="/orders" routerLinkActive="active">
            <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18"/><path d="M6 3h12l1 4H5z"/><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 12h6"/></svg></span>
            <span class="label">Đơn hàng</span>
          </a>
          <a routerLink="/products" routerLinkActive="active">
            <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l1 4H5z"/><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 12h8"/><path d="M8 16h5"/></svg></span>
            <span class="label">Sản phẩm</span>
          </a>
          <a routerLink="/customers" routerLinkActive="active">
            <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="label">Khách hàng</span>
          </a>
          @if (authService.isAdmin()) {
            <a routerLink="/users" routerLinkActive="active">
              <span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="3.5"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg></span>
              <span class="label">Người dùng</span>
            </a>
          }
        </aside>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .layout {
      min-height: 100dvh;
      display: grid;
      grid-template-rows: auto 1fr;
      background: transparent;
      overflow-x: clip;
    }

    .topbar {
      position: relative;
      z-index: 20;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.95rem 1.35rem;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
      box-shadow: 0 6px 20px rgba(25, 35, 58, 0.35);
    }

    h1 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #d8e2ff;
      letter-spacing: 0.2px;
      font-family: var(--font-heading);
    }

    p {
      margin: 0.16rem 0 0;
      color: rgba(255, 255, 255, 0.86);
      font-size: 0.8rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
    }

    .brand-logo {
      width: 1.55rem;
      height: 1.55rem;
      border-radius: 8px;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.86rem;
      min-width: 0;
    }

    .user-chip {
      color: #fff;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 999px;
      padding: 0.34rem 0.64rem;
      white-space: nowrap;
    }

    .topbar-right button {
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 10px;
      padding: 0.4rem 0.72rem;
      cursor: pointer;
      font-weight: 600;
    }

    .topbar-right button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .body {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
      min-height: 0;
      gap: 1rem;
      padding: 1rem;
      align-items: stretch;
      transition: grid-template-columns 0.24s ease;
      overflow-x: hidden;
    }

    .body.sidebar-collapsed {
      grid-template-columns: 78px minmax(0, 1fr);
    }

    .sidebar {
      border: 1px solid #25304d;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      padding: 0.9rem;
      display: grid;
      gap: 0.4rem;
      align-content: start;
      height: 100%;
      position: relative;
      overflow: hidden;
      transition: width 0.24s ease;
      width: 100%;
      min-width: 0;
    }

    .sidebar-toggle {
      width: 2rem;
      height: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.08);
      color: #d8e2ff;
      border-radius: 9px;
      display: grid;
      place-items: center;
      cursor: pointer;
      margin-bottom: 0.35rem;
      justify-self: end;
    }

    .sidebar-toggle svg {
      width: 0.95rem;
      height: 0.95rem;
    }

    .sidebar a {
      text-decoration: none;
      color: #d8e2ff;
      padding: 0.64rem 0.72rem;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      border: 1px solid transparent;
      box-sizing: border-box;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .sidebar a:focus,
    .sidebar a:active {
      outline: none;
    }

    .sidebar a:focus-visible {
      outline: none;
      box-shadow: none;
    }

    .label {
      white-space: nowrap;
    }

    .icon {
      width: 1.55rem;
      height: 1.55rem;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .icon svg {
      width: 0.92rem;
      height: 0.92rem;
    }

    .sidebar a.active,
    .sidebar a:hover {
      background: rgba(64, 153, 255, 0.18);
      border-color: rgba(95, 180, 255, 0.45);
      color: #fff;
    }

    .sidebar.collapsed {
      width: 100%;
    }

    .sidebar.collapsed .label {
      display: none;
    }

    .sidebar.collapsed .sidebar-toggle {
      justify-self: center;
    }

    .sidebar.collapsed a {
      justify-content: center;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }

    .content {
      min-width: 0;
      overflow: visible;
      padding-bottom: 0;
    }

    @media (max-width: 920px) {

      /* ===== Topbar ===== */
      .topbar {
        flex-wrap: wrap;
        padding: 0.72rem 0.82rem;
        gap: 0.6rem;
      }

      h1 {
        font-size: 0.92rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topbar-right {
        width: 100%;
        justify-content: flex-end;
      }

      .user-chip {
        max-width: 58vw;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ===== Body ===== */
      .body {
        display: flex;
        flex-direction: column;
        padding: 0.7rem;
        gap: 0.7rem;
        min-height: 0;
      }

      /* ===== Sidebar ===== */
      .sidebar {
        width: 100%;
        padding: 0.58rem;
        box-sizing: border-box;
        height: 60px;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 0.35rem;

        overflow-x: auto;
        overflow-y: hidden;

        flex: 0 0 auto;
      }

      .sidebar .sidebar-toggle {
        display: none;
      }

      .sidebar a {
        flex: 1 1 0;
        min-width: 0;

        display: flex;
        align-items: center;
        justify-content: center;

        height: 44px;
        padding: 0;
        margin: 0;

        box-sizing: border-box;

        border: 1px solid transparent;
        border-radius: 12px;

        font-size: 0.82rem;
        line-height: 1;
        text-decoration: none;

        -webkit-tap-highlight-color: transparent;
      }

      .sidebar a:hover,
      .sidebar a.active {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.12);
      }

      .sidebar a:focus,
      .sidebar a:focus-visible,
      .sidebar a:active {
        outline: none;
        box-shadow: none;
      }

      .sidebar .label {
        display: none;
      }

      .icon {
        width: 1.28rem;
        height: 1.28rem;
        min-width: 1.28rem;
        min-height: 1.28rem;
        margin: 0;
        flex-shrink: 0;
      }

      /* ===== Content ===== */
      .content {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
      }
    }

    @media (max-width: 560px) {
      .topbar-right {
        gap: 0.45rem;
      }

      .topbar-right button {
        padding: 0.36rem 0.56rem;
      }

      .topbar-right button .btn-content span:last-child {
        display: none;
      }

      .sidebar {
        gap: 0.25rem;
      }

      .sidebar a {
        padding: 0;
      }
    }
  `
})
export class AppLayoutComponent {
  readonly authService = inject(AuthService);
  readonly roleLabels = USER_ROLE_LABELS;
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  sidebarCollapsed = false;

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onLogout(): void {
    this.authService.logout().subscribe();
    this.toastService.info('Đã đăng xuất.');
    this.router.navigate(['/login']);
  }
}
