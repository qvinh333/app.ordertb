import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { USER_ROLES, USER_ROLE_LABELS } from '../../core/constants';
import { PagedResult, UserProfile, UserRole } from '../../core/models';
import { ConfirmModalComponent } from '../../shared/confirm-modal.component';
import { ToastService } from '../../core/toast.service';
import { UsersService } from '../../core/users.service';

@Component({
  selector: 'app-users-page',
  imports: [ReactiveFormsModule, ConfirmModalComponent],
  template: `
    <section class="card">
      <div class="header">
        <h2>Quản lý người dùng (Admin)</h2>
        <button type="button" class="btn-primary" (click)="openCreateModal()">
          <span class="btn-content">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            <span>Tạo người dùng</span>
          </span>
        </button>
      </div>

      @if (loading()) {
        <div class="page-loading" aria-live="polite">
          <span class="page-loading-spinner" aria-hidden="true"></span>
          <span>Đang tải dữ liệu...</span>
        </div>
      }

      <form [formGroup]="filterForm" (ngSubmit)="load(1)" class="filters">
        <input formControlName="search" placeholder="Tìm theo tên" />
        <select formControlName="role">
          <option value="">Tất cả vai trò</option>
          @for (role of userRoles; track role) {
            <option [value]="role">{{ roleLabels[role] }}</option>
          }
        </select>
        <button type="submit">
          <span class="btn-content">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <span>Tìm kiếm</span>
          </span>
        </button>
      </form>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên đăng nhập</th>
              <th>Họ tên</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            @for (user of pageData().items; track user.id; let rowIndex = $index) {
              <tr>
                <td data-label="STT">{{ (pageData().page - 1) * pageData().pageSize + rowIndex + 1 }}</td>
                <td data-label="Tên đăng nhập">{{ user.username }}</td>
                <td data-label="Họ tên">{{ user.fullName }}</td>
                <td data-label="Vai trò">{{ roleLabels[user.role] }}</td>
                <td data-label="Trạng thái">{{ user.isActive === false ? 'Ngưng hoạt động' : 'Đang hoạt động' }}</td>
                <td data-label="Thao tác" class="actions-cell">
                  <button type="button" class="btn-ghost" (click)="openEditModal(user)">
                    <span class="btn-content">
                      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      <span>Sửa</span>
                    </span>
                  </button>
                  <button type="button" class="btn-danger" (click)="deleteUser(user.id)">
                    <span class="btn-content">
                      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      <span>Xóa</span>
                    </span>
                  </button>
                </td>
              </tr>
            }
            @if (!pageData().items.length) {
              <tr class="table-empty-row">
                <td colspan="6">Không có người dùng.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pager">
        <div class="pager-meta">
          <span class="paging-summary">{{ pagingSummary() }}</span>
          <label class="page-size">
            Hiển thị
            <select [value]="pageData().pageSize" (change)="onPageSizeChange($any($event.target).value)">
              @for (size of [10, 20, 50]; track size) {
                <option [value]="size">{{ size }}</option>
              }
            </select>
            / trang
          </label>
        </div>
        <div class="pager-controls">
          <button type="button" class="pager-btn" (click)="load(pageData().page - 1)" [disabled]="pageData().page <= 1">Trước</button>
          <span class="pager-current">Trang {{ pageData().page }} / {{ pageData().totalPages }}</span>
          <button type="button" class="pager-btn" (click)="load(pageData().page + 1)" [disabled]="pageData().page >= pageData().totalPages">Sau</button>
        </div>
      </div>
    </section>

    @if (showFormModal()) {
      <div class="modal-overlay" [class.closing]="formModalClosing()">
        <section
          #userModalRoot
          class="form-modal"
          [class.closing]="formModalClosing()"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown.escape)="onFormEsc($event)"
          (keydown)="onFormKeydown($event)"
        >
          <h3>
            <span class="title-with-icon">
              <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="3.5"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
              <span>{{ editingUserId() ? 'Cập nhật người dùng' : 'Tạo người dùng mới' }}</span>
            </span>
          </h3>

          <form [formGroup]="form" (ngSubmit)="requestSave()" class="form-grid">
            <label>
              Tên đăng nhập *
              <input formControlName="username" [readonly]="!!editingUserId()" />
            </label>

            <label>
              Họ tên *
              <input formControlName="fullName" />
            </label>

            <label>
              Mật khẩu {{ editingUserId() ? '(bỏ trống nếu không đổi)' : '*' }}
              <input type="password" formControlName="password" />
            </label>

            <label>
              Vai trò *
              <select formControlName="role">
                @for (role of userRoles; track role) {
                  <option [value]="role">{{ roleLabels[role] }}</option>
                }
              </select>
            </label>

            <label class="toggle full">
              <input type="checkbox" formControlName="isActive" />
              <span>Kích hoạt tài khoản</span>
            </label>

            @if (formError()) {
              <div class="error full">{{ formError() }}</div>
            }

            <div class="actions full">
              <button type="button" (click)="closeFormModal()">Hủy</button>
              <button type="button" class="btn-primary" [disabled]="saving()" (click)="requestSave()">
                <span class="btn-content">
                  <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
                  <span>Lưu</span>
                </span>
              </button>
            </div>
          </form>
        </section>
      </div>
    }

    <app-confirm-modal
      [open]="showSaveConfirm()"
      [loading]="saving()"
      [title]="editingUserId() ? 'Xác nhận cập nhật người dùng' : 'Xác nhận tạo người dùng'"
      [message]="editingUserId() ? 'Bạn có chắc chắn muốn lưu thay đổi người dùng này?' : 'Bạn có chắc chắn muốn tạo người dùng mới?'"
      (cancel)="showSaveConfirm.set(false)"
      (confirm)="confirmSave()"
    />

    <app-confirm-modal
      [open]="showDeleteConfirm()"
      [loading]="deleting()"
      title="Xác nhận xóa người dùng"
      message="Bạn có chắc chắn muốn xóa người dùng đã chọn?"
      (cancel)="cancelDelete()"
      (confirm)="confirmDelete()"
    />
  `,
  styles: `
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .page-loading {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.44rem 0.64rem;
      border: 1px solid #d7e3f5;
      border-radius: 999px;
      background: #f5f9ff;
      color: #35507a;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .page-loading-spinner {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 50%;
      border: 2px solid #c7dbfa;
      border-top-color: #3f8cff;
      animation: spin 0.8s linear infinite;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.7rem;
      margin-bottom: 0.9rem;
    }

    h2,
    h3 {
      margin: 0;
    }

    h2 {
      font-size: 1.05rem;
      font-weight: 700;
    }

    .btn-primary {
      background: linear-gradient(90deg, var(--primary), var(--primary-600));
      color: #fff;
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 0.5rem 0.78rem;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 8px 18px rgba(64, 153, 255, 0.24);
    }

    .filters {
      display: grid;
      grid-template-columns: 2fr 1fr auto;
      gap: 0.55rem;
      margin-bottom: 0.95rem;
    }

    input,
    select,
    button {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.46rem 0.62rem;
      background: #fff;
    }

    .filters button {
      cursor: pointer;
      font-weight: 600;
      background: #f8fbff;
    }

    .filters button:hover {
      border-color: #b8d8ff;
      background: #f0f7ff;
    }

    .table-wrap {
      overflow: auto;
      border: 1px solid #edf0f6;
      border-radius: 12px;
      background: #fff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 700px;
    }

    th,
    td {
      border-bottom: 1px solid #eef2f8;
      padding: 0.62rem 0.48rem;
      text-align: left;
      font-size: 0.88rem;
    }

    th {
      color: #d8e2ff;
      font-weight: 600;
      background: linear-gradient(180deg, #26314d 0%, #1f2940 100%);
    }

    tbody tr:hover td {
      background: #fafcff;
    }

    td > button {
      margin-right: 0.35rem;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.4rem 0.62rem;
    }

    td > button:last-child {
      margin-right: 0;
    }

    .btn-ghost {
      border-color: #cfe0ff;
      color: #1d5fbf;
      background: #f0f7ff;
    }

    .btn-danger {
      background: linear-gradient(90deg, #ff5370, #ff6f89);
      color: #fff;
      border-color: transparent;
    }

    .pager {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      margin-top: 0.72rem;
      color: var(--text-muted);
      font-size: 0.88rem;
      flex-wrap: wrap;
      border-top: 1px solid #ecf1f8;
      padding-top: 0.68rem;
    }

    .pager-meta,
    .pager-controls {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 0;
    }

    .paging-summary,
    .pager-current {
      padding: 0.34rem 0.6rem;
      border-radius: 999px;
      background: #f5f8fd;
      border: 1px solid #dce7f6;
      color: #405372;
      font-weight: 600;
      white-space: nowrap;
    }

    .pager-btn {
      background: #fff;
      border: 1px solid #d6e1f2;
      border-radius: 10px;
      padding: 0.4rem 0.72rem;
      font-weight: 600;
      cursor: pointer;
    }

    .pager-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .page-size {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(22, 31, 56, 0.42);
      backdrop-filter: blur(2px);
      display: grid;
      place-items: center;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    .modal-overlay.closing {
      animation: fadeOut 0.18s ease forwards;
      pointer-events: none;
    }

    .form-modal {
      width: min(520px, 100%);
      max-height: 90dvh;
      overflow: auto;
      background: #fff;
      border-radius: 14px;
      border: 1px solid var(--border);
      box-shadow: 0 22px 50px rgba(16, 24, 40, 0.25);
      padding: 1rem;
      animation: scaleIn 0.22s ease;
      display: grid;
      gap: 0.68rem;
    }

    .form-modal.closing {
      animation: scaleOut 0.18s ease forwards;
      pointer-events: none;
    }

    .form-modal h3 {
      padding-bottom: 0.65rem;
      border-bottom: 1px solid #eef2f8;
    }

    .title-with-icon {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .title-icon {
      width: 1rem;
      height: 1rem;
      color: #2e4368;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.58rem;
    }

    .form-grid label {
      display: grid;
      gap: 0.3rem;
      font-size: 0.86rem;
      color: var(--text-muted);
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--text);
      padding-top: 0.35rem;
    }

    .toggle input[type='checkbox'] {
      width: 1rem;
      height: 1rem;
      accent-color: var(--primary);
      margin: 0;
      cursor: pointer;
    }

    .full {
      grid-column: 1 / -1;
    }

    .actions {
      display: flex;
      justify-content: end;
      gap: 0.5rem;
      margin-top: 0.2rem;
    }

    .actions button:first-child {
      background: #f8fbff;
    }

    .error {
      color: #b42318;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      padding: 0.58rem 0.68rem;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 768px) {
      .table-wrap {
        border: none;
        background: transparent;
      }

      table {
        min-width: 0;
        border-collapse: separate;
      }

      thead {
        display: none;
      }

      tbody {
        display: grid;
        gap: 0.6rem;
      }

      tbody tr {
        display: block;
        border: 1px solid #e6edf7;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 4px 14px rgba(20, 39, 70, 0.06);
        padding: 0.2rem 0;
      }

      tbody tr td {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.5rem 0.7rem;
        white-space: normal;
        border-bottom: 1px solid #f2f5fa;
      }

      tbody tr td::before {
        content: attr(data-label);
        font-weight: 600;
        color: #5f708f;
        font-size: 0.78rem;
        min-width: 6.2rem;
      }

      tbody tr td:last-child {
        border-bottom: none;
      }

      .actions-cell {
        display: grid;
        gap: 0.4rem;
        justify-content: stretch;
      }

      .actions-cell::before {
        margin-top: 0.2rem;
      }

      .actions-cell button {
        width: 100%;
        margin: 0;
      }

      .table-empty-row {
        padding: 0;
      }

      .table-empty-row td {
        display: block;
        text-align: center;
        border-bottom: none;
        padding: 0.9rem;
      }

      .table-empty-row td::before {
        display: none;
      }
    }

    @media (max-width: 900px) {
      .filters,
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .pager {
        align-items: stretch;
      }

      .pager-meta,
      .pager-controls {
        width: 100%;
        justify-content: space-between;
      }

      .pager-btn {
        flex: 1 1 0;
      }

      .pager-current {
        flex: 1 1 100%;
        text-align: center;
        order: -1;
      }
    }
  `
})
export class UsersPage implements OnInit {
  @ViewChild('userModalRoot') private userModalRoot?: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userRoles = USER_ROLES;
  readonly roleLabels = USER_ROLE_LABELS;
  readonly editingUserId = signal<number | null>(null);
  readonly showFormModal = signal(false);
  readonly formModalClosing = signal(false);
  readonly showSaveConfirm = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly formError = signal('');

  private deletingUserId: number | null = null;

  readonly pageData = signal<PagedResult<UserProfile>>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1
  });

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    role: ['']
  });

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    fullName: ['', [Validators.required]],
    password: ['', [Validators.minLength(6)]],
    role: ['SELLER' as UserRole, [Validators.required]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    if (page < 1 || page > this.pageData().totalPages + 1) {
      return;
    }

    const filter = this.filterForm.getRawValue();
    this.loading.set(true);
    this.usersService
      .list({
        page,
        pageSize: this.pageData().pageSize,
        search: filter.search,
        role: filter.role as UserRole | ''
      })
      .pipe(
        timeout(20000),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (result) => this.pageData.set(result),
        error: () => {
          this.toastService.error('Không thể tải danh sách người dùng. Vui lòng thử lại.');
        }
      });
  }

  onPageSizeChange(rawValue: string): void {
    const nextSize = Number(rawValue);
    if (!Number.isNaN(nextSize) && nextSize > 0) {
      this.pageData.update((data) => ({ ...data, pageSize: nextSize }));
      this.load(1);
    }
  }

  openCreateModal(): void {
    this.editingUserId.set(null);
    this.formError.set('');
    this.form.reset({
      username: '',
      fullName: '',
      password: '',
      role: 'SELLER',
      isActive: true
    });
    this.showFormModal.set(true);
    this.formModalClosing.set(false);
    this.focusUserModal();
  }

  openEditModal(user: UserProfile): void {
    this.editingUserId.set(user.id);
    this.formError.set('');
    this.form.patchValue({
      username: user.username,
      fullName: user.fullName,
      password: '',
      role: user.role,
      isActive: user.isActive ?? true
    });
    this.showFormModal.set(true);
    this.formModalClosing.set(false);
    this.focusUserModal();
  }

  closeFormModal(): void {
    this.formModalClosing.set(true);
    this.showSaveConfirm.set(false);
    this.formError.set('');
    this.saving.set(false);
    setTimeout(() => {
      this.showFormModal.set(false);
      this.formModalClosing.set(false);
    }, 180);
  }

  onFormEsc(event: Event): void {
    event.preventDefault();
    this.closeFormModal();
  }

  onFormKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const host = this.userModalRoot?.nativeElement;
    if (!host) {
      return;
    }

    const focusables = host.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  requestSave(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Vui lòng nhập đầy đủ thông tin bắt buộc trước khi lưu.');
      return;
    }

    const raw = this.form.getRawValue();
    if (!this.editingUserId() && (!raw.password || raw.password.length < 6)) {
      this.formError.set('Mật khẩu tối thiểu 6 ký tự khi tạo mới người dùng.');
      return;
    }

    this.formError.set('');
    this.showSaveConfirm.set(true);
  }

  confirmSave(): void {
    if (this.form.invalid || this.saving()) {
      this.showSaveConfirm.set(false);
      return;
    }

    this.showSaveConfirm.set(false);
    this.saving.set(true);

    const raw = this.form.getRawValue();

    if (this.editingUserId()) {
      this.usersService
        .update(this.editingUserId()!, {
          fullName: raw.fullName,
          role: raw.role,
          isActive: raw.isActive
        })
        .pipe(
          timeout(20000),
          finalize(() => this.saving.set(false))
        )
        .subscribe({
          next: () => {
            this.toastService.success('Cập nhật người dùng thành công.');
            this.closeFormModal();
            this.load(this.pageData().page);
          },
          error: (error) => {
            this.formError.set(error?.error?.message ?? 'Không thể cập nhật người dùng.');
          }
        });
      return;
    }

    this.usersService
      .create({
        username: raw.username,
        password: raw.password,
        fullName: raw.fullName,
        role: raw.role
      })
      .pipe(
        timeout(20000),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.success('Tạo người dùng thành công.');
          this.closeFormModal();
          this.load(this.pageData().page);
        },
        error: (error) => {
          this.formError.set(error?.error?.message ?? 'Không thể tạo người dùng.');
        }
      });
  }

  deleteUser(id: number): void {
    this.deletingUserId = id;
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingUserId = null;
  }

  confirmDelete(): void {
    const targetUserId = this.deletingUserId;
    if (!targetUserId || this.deleting()) {
      this.cancelDelete();
      return;
    }

    this.cancelDelete();
    this.deleting.set(true);
    this.usersService
      .delete(targetUserId)
      .pipe(
        timeout(20000),
        finalize(() => this.deleting.set(false))
      )
      .subscribe({
        next: () => {
          const currentUserId = this.authService.currentUser()?.id;
          this.toastService.success('Đã xóa người dùng.');

          if (currentUserId === targetUserId) {
            this.authService.clearSession();
            this.toastService.info('Tài khoản hiện tại đã bị xóa. Vui lòng đăng nhập lại.');
            this.router.navigate(['/login']);
            return;
          }

          const currentPage = this.pageData().page;
          const isLastItemOnPage = this.pageData().items.length <= 1;
          const nextPage = currentPage > 1 && isLastItemOnPage ? currentPage - 1 : currentPage;
          this.load(nextPage);
        },
        error: () => {
          this.toastService.error('Không thể xóa người dùng. Vui lòng thử lại.');
        }
      });
  }

  pagingSummary(): string {
    const data = this.pageData();
    if (!data.totalItems) {
      return '0 kết quả';
    }

    const from = (data.page - 1) * data.pageSize + 1;
    const to = Math.min(data.page * data.pageSize, data.totalItems);
    return `${from}-${to} / ${data.totalItems}`;
  }

  private focusUserModal(): void {
    setTimeout(() => this.userModalRoot?.nativeElement.focus(), 0);
  }
}

