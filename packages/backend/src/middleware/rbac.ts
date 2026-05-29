/**
 * RBAC (Role-Based Access Control) types for the letter service.
 * Defines roles and permissions for enterprise use.
 */

export type Role = 'admin' | 'template_author' | 'letter_creator' | 'viewer';

export interface Permission {
  resource: 'template' | 'letter' | 'audit';
  actions: ('create' | 'read' | 'update' | 'delete' | 'publish' | 'send' | 'archive')[];
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: 'template', actions: ['create', 'read', 'update', 'delete', 'publish'] },
    { resource: 'letter', actions: ['create', 'read', 'update', 'delete', 'send', 'archive'] },
    { resource: 'audit', actions: ['read'] },
  ],
  template_author: [
    { resource: 'template', actions: ['create', 'read', 'update', 'publish'] },
    { resource: 'letter', actions: ['read'] },
  ],
  letter_creator: [
    { resource: 'template', actions: ['read'] },
    { resource: 'letter', actions: ['create', 'read', 'update', 'send', 'archive'] },
  ],
  viewer: [
    { resource: 'template', actions: ['read'] },
    { resource: 'letter', actions: ['read'] },
  ],
};

export function hasPermission(role: Role, resource: Permission['resource'], action: Permission['actions'][number]): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.some((p) => p.resource === resource && p.actions.includes(action));
}

export function extractRole(claims: Record<string, unknown> | undefined): Role {
  if (!claims) return 'viewer';
  const groups = (claims['cognito:groups'] as string[]) || [];
  if (groups.includes('admin')) return 'admin';
  if (groups.includes('template_author')) return 'template_author';
  if (groups.includes('letter_creator')) return 'letter_creator';
  return 'viewer';
}
