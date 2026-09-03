import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthorizationFeedbackService } from '../../core/services/authorization-feedback.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell-container">
      <!-- MOBILE DRAWER BACKDROP -->
      @if (mobileNavOpen) {
        <div
          class="mobile-backdrop"
          aria-hidden="true"
          (click)="closeMobileNav()"
        ></div>
      }

      <!-- FIXED LEFT SIDEBAR (100% STATIONARY) -->
      <aside
        class="app-sidebar"
        [class.mobile-open]="mobileNavOpen"
        aria-label="Application Sidebar"
      >
        <!-- SIDEBAR HEADER / BRAND -->
        <div class="sidebar-header">
          <a
            class="sidebar-brand-link"
            [routerLink]="(auth.currentUser$ | async)?.role === 'SUPER_ADMIN' ? '/owner-dashboard' : '/dashboard'"
            (click)="closeMobileNav()"
          >
            <img
              src="assets/seyyon-logo.png"
              alt="Seyyon Connect"
              class="sidebar-logo"
            />
          </a>
        </div>

        <!-- SIDEBAR NAVIGATION (FROZEN/NO SCROLLBAR) -->
        <div class="sidebar-scrollable-content">
          @if (auth.currentUser$ | async; as user) {
            <div class="nav-section-label">
              <span>{{ user.role === 'SUPER_ADMIN' ? 'PLATFORM COMMAND' : 'MAIN MENU' }}</span>
            </div>

            <nav
              class="primary-nav sidebar-nav"
              aria-label="Primary navigation"
            >
              @for (item of navigation; track item.path) {
                @if (canShow(item.roles, user.role)) {
                  <a
                    class="sidebar-nav-item"
                    [routerLink]="item.path"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="{ exact: true }"
                    (click)="closeMobileNav()"
                  >
                    <span class="nav-item-icon-wrapper" aria-hidden="true">
                      <i class="bi {{ item.icon }}"></i>
                    </span>
                    <span class="nav-item-text">{{ item.label }}</span>
                  </a>
                }
              }
            </nav>
          }
        </div>

        <!-- SIDEBAR FOOTER / ADMIN PROFILE -->
        @if (auth.currentUser$ | async; as user) {
          <div class="sidebar-footer">
            <div class="sidebar-user-card">
              <div class="user-info text-truncate">
                <span class="user-name text-truncate">{{ user.firstName }} {{ user.lastName || '' }}</span>
                <span class="user-role-label text-truncate">{{ getRoleLabel(user.role) }}</span>
              </div>
              <button
                class="btn-sidebar-logout"
                type="button"
                (click)="auth.logout()"
                aria-label="Log out of Seyyon Connect"
                title="Log out"
              >
                <i class="bi bi-power" aria-hidden="true"></i>
                <span class="d-none">Logout</span>
              </button>
            </div>
          </div>
        }
      </aside>

      <!-- SCROLLABLE RIGHT MAIN PANEL (INDEPENDENT SCROLL) -->
      <div class="app-main-wrapper">
        <!-- STICKY TOP HEADER -->
        <header class="app-topbar">
          <div class="topbar-left">
            <button
              class="btn-mobile-toggle d-xl-none"
              type="button"
              aria-label="Toggle navigation menu"
              (click)="toggleMobileNav()"
            >
              <i class="bi bi-list" aria-hidden="true"></i>
            </button>

          </div>

          <div class="topbar-right">
            <!-- Platform Status Pill -->
            <div class="platform-status-pill">
              <span class="status-pulse-dot" aria-hidden="true"></span>
              <span>Seyyon Live</span>
            </div>

            @if (auth.currentUser$ | async; as user) {
              <!-- Notifications Icon Button -->
              <a
                class="topbar-icon-btn"
                routerLink="/notifications"
                aria-label="View notifications and activity"
                title="Activity & Notifications"
              >
                <i class="bi bi-bell" aria-hidden="true"></i>
              </a>

              <!-- Settings Link Button -->
              <a
                class="topbar-link-btn d-none d-lg-inline-flex"
                routerLink="/settings"
                aria-label="Account and platform settings"
              >
                <i class="bi bi-gear me-1" aria-hidden="true"></i>
                <span>Settings</span>
              </a>

              <!-- Logout Button -->
              <button
                class="btn-topbar-logout"
                type="button"
                (click)="auth.logout()"
                aria-label="Logout"
              >
                <i class="bi bi-box-arrow-right me-1" aria-hidden="true"></i>
                <span>Logout</span>
              </button>
            }
          </div>
        </header>

        <!-- MAIN ROUTED CONTENT AREA -->
        <main class="app-content-area">
          @if (feedback.message$ | async; as message) {
            <div class="alert alert-warning alert-dismissible mx-0 mb-3" role="alert">
              {{ message }}
              <button
                class="btn-close"
                type="button"
                aria-label="Dismiss"
                (click)="feedback.clear()"
              ></button>
            </div>
          }
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      // Variables
      $navy: #0f1b3d;
      $blue: #2563eb;
      $blue-hover: #1d4ed8;
      $indigo: #4338ca;
      $gold: #d97706;
      $gold-bg: #fffbeb;
      $gold-border: rgba(245, 158, 11, 0.35);
      $green: #10b981;
      $surface: #ffffff;
      $page-bg: #f5f5f5;
      $border: #eeeeee;
      $border-strong: #e2e8f0;
      $text-dark: #172033;
      $text-muted: #64748b;

      .app-shell-container {
        display: flex;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        background-color: $page-bg;
        position: relative;
        box-sizing: border-box;
      }

      // -----------------------------------------------------------------------
      // FIXED LEFT SIDEBAR (100% STATIONARY & FROZEN, ZERO SCROLLBAR)
      // -----------------------------------------------------------------------
      .app-sidebar {
        width: 260px;
        min-width: 260px;
        max-width: 260px;
        height: 100vh;
        max-height: 100vh;
        flex-shrink: 0;
        background-color: #ffffff;
        color: $text-dark;
        display: flex;
        flex-direction: column;
        z-index: 100;
        border-right: 1px solid $border-strong;
        box-shadow: 2px 0 8px rgba(15, 27, 61, 0.02);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;

        .sidebar-header {
          height: 64px;
          min-height: 64px;
          padding: 0 1.25rem;
          box-sizing: border-box;
          border-bottom: 1px solid $border;
          display: flex;
          align-items: center;
          flex-shrink: 0;

          .sidebar-brand-link {
            display: inline-flex;
            align-items: center;
            text-decoration: none;
            width: 100%;

            .sidebar-logo {
              height: 39px;
              width: 100%;
              max-width: 215px;
              object-fit: cover;
            }
          }
        }

        .sidebar-scrollable-content {
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;

          // COMPLETELY HIDE SIDE SCROLLBAR
          scrollbar-width: none;
          -ms-overflow-style: none;
          &::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }

          .nav-section-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: $blue;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            padding: 0.25rem 0.5rem 0.65rem;
          }
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0;

          .sidebar-nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 10px;
            color: #475569;
            background-color: transparent;
            text-decoration: none;
            font-size: 0.9375rem;
            font-weight: 600;
            border: 1px solid transparent;
            transition: all 0.15s ease-in-out;
            position: relative;
            white-space: nowrap;

            .nav-item-icon-wrapper {
              font-size: 1.15rem;
              display: grid;
              place-items: center;
              color: #64748b;
              transition: color 0.15s ease;
            }

            .nav-item-text {
              line-height: 1.25;
            }

            &:hover {
              color: $blue;
              background-color: #eff6ff;
              border-color: #dbeafe;

              .nav-item-icon-wrapper {
                color: $blue;
              }
            }

            &.active {
              color: #ffffff;
              background: linear-gradient(90deg, #2563eb 0%, #3730a3 100%);
              border-color: transparent;
              box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);

              .nav-item-icon-wrapper {
                color: #ffffff;
              }
            }

            &:focus-visible {
              outline: 2px solid $blue;
              outline-offset: 2px;
            }
          }
        }

        .sidebar-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid $border;
          background-color: #ffffff;
          margin-top: auto;
          flex-shrink: 0;

          .sidebar-user-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;

            .user-info {
              flex: 1 1 auto;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 0.15rem;

              .user-name {
                font-size: 0.875rem;
                font-weight: 700;
                color: $text-dark;
                line-height: 1.2;
              }

              .user-role-label {
                font-size: 0.75rem;
                color: $text-muted;
                line-height: 1.2;
              }
            }

            .btn-sidebar-logout {
              background-color: #fef2f2;
              border: 1px solid rgba(239, 68, 68, 0.25);
              padding: 0;
              color: #dc2626;
              font-size: 1.1rem;
              cursor: pointer;
              border-radius: 8px;
              width: 34px;
              height: 34px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              line-height: 1;
              transition: all 0.15s ease;
              flex-shrink: 0;

              i {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                font-size: 1.1rem;
                width: auto;
                height: auto;
              }

              &:hover {
                background-color: #fee2e2;
                border-color: rgba(239, 68, 68, 0.4);
                color: #991b1b;
                transform: scale(1.04);
              }

              &:focus-visible {
                outline: 2px solid #ef4444;
              }
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // SCROLLABLE RIGHT MAIN PANEL (INDEPENDENT VERTICAL SCROLL)
      // -----------------------------------------------------------------------
      .app-main-wrapper {
        flex: 1 1 0%;
        min-width: 0;
        height: 100vh;
        max-height: 100vh;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        background-color: $page-bg;
        box-sizing: border-box;
      }

      .app-topbar {
        height: 64px;
        min-height: 64px;
        background-color: $surface;
        border-bottom: 1px solid $border;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
        gap: 1rem;
        position: sticky;
        top: 0;
        z-index: 90;
        box-shadow: 0 1px 3px rgba(15, 27, 61, 0.02);
        box-sizing: border-box;
        flex-shrink: 0;

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;

          .btn-mobile-toggle {
            background: transparent;
            border: 1px solid $border-strong;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            font-size: 1.25rem;
            color: $text-dark;
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: all 0.15s ease;
            flex-shrink: 0;

            &:hover {
              background-color: #f8fafc;
              color: $blue;
            }
          }

          .topbar-breadcrumbs {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            .breadcrumb-root {
              color: $text-muted;
              font-weight: 500;
            }

            .breadcrumb-separator {
              color: #cbd5e1;
              font-size: 0.8125rem;
            }

            .breadcrumb-active {
              color: $navy;
              font-weight: 700;
            }
          }
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          flex-shrink: 0;

          .platform-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            padding: 0.35rem 0.85rem;
            background-color: #ecfdf5;
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #059669;
            white-space: nowrap;

            .status-pulse-dot {
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background-color: #059669;
              box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
            }
          }

          .topbar-icon-btn {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            background-color: $surface;
            border: 1px solid $border-strong;
            color: $text-muted;
            display: grid;
            place-items: center;
            text-decoration: none;
            font-size: 1.05rem;
            transition: all 0.15s ease;
            flex-shrink: 0;

            &:hover {
              color: $blue;
              background-color: #eff6ff;
              border-color: rgba(37, 99, 235, 0.3);
            }
          }

          .topbar-link-btn {
            display: inline-flex;
            align-items: center;
            padding: 0.45rem 0.95rem;
            font-size: 0.8125rem;
            font-weight: 600;
            color: $text-dark;
            text-decoration: none;
            border-radius: 8px;
            border: 1px solid $border-strong;
            background-color: $surface;
            transition: all 0.15s ease;
            white-space: nowrap;

            &:hover {
              color: $navy;
              background-color: #f8fafc;
            }
          }

          .btn-topbar-logout {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.45rem 1rem;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #dc2626;
            border: 1px solid rgba(239, 68, 68, 0.3);
            background-color: #fef2f2;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;

            &:hover {
              background-color: #fee2e2;
              border-color: rgba(239, 68, 68, 0.5);
              color: #b91c1c;
            }

            &:focus-visible {
              outline: 2px solid #ef4444;
            }
          }
        }
      }

      .app-content-area {
        flex: 1 0 auto;
        min-width: 0;
        width: 100%;
        background-color: #fff;
        padding: 1.75rem 2rem 3rem;
        box-sizing: border-box;
      }

      // -----------------------------------------------------------------------
      // MOBILE DRAWER OVERLAY
      // -----------------------------------------------------------------------
      .mobile-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgba(15, 27, 61, 0.5);
        backdrop-filter: blur(2px);
        z-index: 99;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      // Responsive Breakpoints
      @media (max-width: 1199.98px) {
        .app-sidebar {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.25);

          &.mobile-open {
            transform: translateX(0);
          }
        }

        .app-topbar {
          padding: 0 1.25rem;
        }

        .app-content-area {
          padding: 1.5rem 1.25rem 3.5rem;
        }
      }

      @media (max-width: 575.98px) {
        .app-topbar {
          height: 56px;
          min-height: 56px;
          padding: 0 0.875rem;

          .btn-topbar-logout {
            padding: 0.35rem 0.65rem;
            font-size: 0.75rem;
          }
        }

        .app-content-area {
          padding: 1.25rem 1rem 4rem;
        }
      }
    `,
  ],
})
export class AppLayoutComponent {
  readonly auth = inject(AuthService);
  readonly feedback = inject(AuthorizationFeedbackService);
  mobileNavOpen = false;

  canShow(roles: readonly string[], role: string): boolean {
    return roles.includes(role);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  getUserInitials(user: { firstName?: string; lastName?: string | null } | null): string {
    if (!user || !user.firstName) return 'AD';
    const first = user.firstName.charAt(0);
    const last = user.lastName ? user.lastName.charAt(0) : '';
    return (first + last).toUpperCase() || 'AD';
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'COMPANY_ADMIN':
        return 'Company Admin';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Team Member';
      default:
        return 'User';
    }
  }

  readonly navigation = [
    {
      path: '/owner-dashboard',
      label: 'Owner Dashboard',
      icon: 'bi-speedometer2',
      roles: ['SUPER_ADMIN'],
    },
    {
      path: '/companies',
      label: 'Client Management',
      icon: 'bi-building',
      roles: ['SUPER_ADMIN'],
    },
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'bi-grid',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: 'bi-people',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/templates',
      label: 'Templates',
      icon: 'bi-chat-square-text',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/campaigns',
      label: 'Campaigns',
      icon: 'bi-megaphone',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/media',
      label: 'Media',
      icon: 'bi-collection',
      roles: ['COMPANY_ADMIN'],
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: 'bi-bar-chart',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/usage',
      label: 'Usage & Costs',
      icon: 'bi-pie-chart',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/subscription',
      label: 'Subscription',
      icon: 'bi-credit-card',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/notifications',
      label: 'Notifications',
      icon: 'bi-bell',
      roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'bi-gear',
      roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
    {
      path: '/settings/whatsapp',
      label: 'WhatsApp',
      icon: 'bi-whatsapp',
      roles: ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'],
    },
  ] as const;
}
