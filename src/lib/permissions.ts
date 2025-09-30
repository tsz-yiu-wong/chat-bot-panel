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
export const MENU_CONFIG: Record<string, { key: string; icon: string; label: string; labelKey: string }> = {
  '/dashboard': { key: 'dashboard', icon: 'Gauge', label: 'Dashboard', labelKey: 'sidebar.dashboard' },
  '/users': { key: 'users', icon: 'Users', label: 'Users', labelKey: 'sidebar.users' },
  '/characters': { key: 'characters', icon: 'Bot', label: 'Characters', labelKey: 'sidebar.characters' },
  '/prompts': { key: 'prompts', icon: 'MessageSquareQuote', label: 'Prompts', labelKey: 'sidebar.prompts' },
  '/knowledge': { key: 'knowledge', icon: 'BookOpen', label: 'Knowledge', labelKey: 'sidebar.knowledge' },
  '/topics': { key: 'topics', icon: 'FileText', label: 'Topics', labelKey: 'sidebar.topics' },
  '/settings': { key: 'settings', icon: 'Settings', label: 'Settings', labelKey: 'sidebar.settings' },
  '/testing': { key: 'testing', icon: 'FlaskConical', label: 'Testing', labelKey: 'sidebar.testing' },
  '/permission': { key: 'permission', icon: 'ShieldQuestion', label: 'Permission', labelKey: 'sidebar.permission' },
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
  '/testing',
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
 * @returns {Array<{ key: string; href: string; icon: string; label: string; labelKey: string }>} - An array of menu item objects.
 */
export function getMenuItems(userRole: UserRole): Array<{ key: string; href: string; icon: string; label: string; labelKey: string }> {
  const menuPaths = ROLE_CONFIG[userRole].menuItems;
  return menuPaths.map(href => ({
    href,
    ...MENU_CONFIG[href],
  }));
}

/**
 * 操作权限定义
 * 定义不同角色对数据的增删改查权限
 */
export const OPERATION_PERMISSIONS: Record<UserRole, {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}> = {
  user: {
    canCreate: true,   // user 可以添加数据
    canEdit: false,    // user 不能编辑数据
    canDelete: false,  // user 不能删除数据
  },
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  super_admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
};

/**
 * 检查用户是否有执行指定操作的权限
 *
 * @param {UserRole} role - 用户角色
 * @param {string} operation - 操作类型：'create', 'edit', 'delete'
 * @returns {boolean} - 是否有权限
 */
export function hasOperationPermission(role: UserRole, operation: 'create' | 'edit' | 'delete'): boolean {
  const permissions = OPERATION_PERMISSIONS[role];
  switch (operation) {
    case 'create': return permissions.canCreate;
    case 'edit': return permissions.canEdit;
    case 'delete': return permissions.canDelete;
    default: return false;
  }
}
