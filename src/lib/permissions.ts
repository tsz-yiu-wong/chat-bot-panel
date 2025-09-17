/**
 * @fileoverview
 * This file centralizes the role-based access control (RBAC) configuration for the application.
 * It defines user roles, menu items, and the permissions associated with each role in a hierarchical manner.
 * This structure is designed to be easily maintainable and scalable.
 *
 * @see /middleware.ts - for permission enforcement
 * @see /src/components/layout/sidebar.tsx - for dynamic menu rendering
 */

export type UserRole = 'user' | 'admin' | 'super_admin';

/**
 * Master list of all possible menu items in the application.
 * This serves as a single source of truth for menu configuration.
 * The `icon` property corresponds to the name of a Lucide icon component.
 */
export const MENU_CONFIG: Record<string, { icon: string; labelKey: string }> = {
  '/dashboard': { icon: 'Gauge', labelKey: 'sidebar.dashboard' },
  '/users': { icon: 'Users', labelKey: 'sidebar.users' },
  '/characters': { icon: 'Bot', labelKey: 'sidebar.characters' },
  '/prompts': { icon: 'MessageSquareQuote', labelKey: 'sidebar.prompts' },
  '/knowledge': { icon: 'BookOpen', labelKey: 'sidebar.knowledge' },
  '/topics': { icon: 'FileText', labelKey: 'sidebar.topics' },
  '/settings': { icon: 'Settings', labelKey: 'sidebar.settings' },
  '/test-chat': { icon: 'FlaskConical', labelKey: 'sidebar.test_chat' },
  '/ui': { icon: 'LayoutDashboard', labelKey: 'sidebar.ui_components' },
  '/permission': { icon: 'ShieldQuestion', labelKey: 'sidebar.permission' },
};

/**
 * Defines the page routes that are publicly accessible to all users,
 * regardless of their authentication status or role.
 */
const PUBLIC_PAGES: string[] = ['/login'];

/**
 * Defines the menu structure for each role in a hierarchical way.
 * Higher-level roles inherit the menu items of lower-level roles.
 */
const USER_MENU_ITEMS: string[] = [
  '/users',
  '/characters',
  '/prompts',
  '/knowledge',
  '/topics',
];

const ADMIN_MENU_ITEMS: string[] = [
  '/dashboard',
  ...USER_MENU_ITEMS,
  '/settings',
];

const SUPER_ADMIN_MENU_ITEMS: string[] = [
  ...ADMIN_MENU_ITEMS,
  '/test-chat',
  '/ui',
  '/permission',
];

/**
 * Maps each user role to its corresponding menu items and default page.
 * This is the core of the permission definition.
 */
const ROLE_CONFIG: Record<UserRole, { menuItems: string[]; defaultPage: string }> = {
  user: {
    menuItems: USER_MENU_ITEMS,
    defaultPage: '/',
  },
  admin: {
    menuItems: ADMIN_MENU_ITEMS,
    defaultPage: '/',
  },
  super_admin: {
    menuItems: SUPER_ADMIN_MENU_ITEMS,
    defaultPage: '/',
  },
};

/**
 * Checks if a user with a given role has permission to access a specific page.
 * Permission is granted if the page is public, if it's the user's default page, 
 * or if it's included in the role's accessible pages (derived from menu items).
 * This function supports checking against sub-paths (e.g., /users/123).
 *
 * @param {UserRole} userRole - The role of the user.
 * @param {string} page - The page route to check.
 * @returns {boolean} - True if the user has permission, false otherwise.
 */
export function hasPagePermission(userRole: UserRole, page: string): boolean {
  if (PUBLIC_PAGES.includes(page)) {
    return true;
  }

  // 用户总是可以访问自己的默认页面
  const defaultPage = ROLE_CONFIG[userRole].defaultPage;
  if (page === defaultPage) {
    return true;
  }

  const allowedPages = ROLE_CONFIG[userRole].menuItems;

  // Check for exact match or if the page is a sub-path of an allowed page.
  return allowedPages.some(allowedPage =>
    page === allowedPage || page.startsWith(`${allowedPage}/`)
  );
}

/**
 * Retrieves the default page for a given user role.
 *
 * @param {UserRole} userRole - The role of the user.
 * @returns {string} - The default page route for the role.
 */
export function getDefaultPage(userRole: UserRole): string {
  return ROLE_CONFIG[userRole].defaultPage;
}

/**
 * Retrieves the formatted menu items for a given user role.
 *
 * @param {UserRole} userRole - The role of the user.
 * @returns {Array<{ href: string; icon: string; labelKey: string }>} - An array of menu item objects.
 */
export function getMenuItems(userRole: UserRole): Array<{ href: string; icon: string; labelKey: string }> {
  const menuPaths = ROLE_CONFIG[userRole].menuItems;
  return menuPaths.map(href => ({
    href,
    ...MENU_CONFIG[href],
  }));
}
