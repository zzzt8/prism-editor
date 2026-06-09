// Auth types for role-based access control

/**
 * Three-layer role model for Prism Editor.
 * Matches P1-5 requirement: author / operator / admin.
 */
export enum AuthRole {
  /** Can create, edit, and publish workflows */
  _AUTHOR = 'author',
  /** Can read and execute published workflows (default for all users) */
  _OPERATOR = 'operator',
  /** Full platform administration access */
  _ADMIN = 'admin',
}

/**
 * Granular permissions within the platform.
 * Roles are assigned permission sets via RolePermissions.
 */
export enum AuthPermission {
  _READ = 'read',
  _EXECUTE = 'execute',
  _EDIT = 'edit',
  _PUBLISH = 'publish',
  _MANAGE = 'manage',
}

/**
 * Permission set for each built-in role.
 * Maps role -> set of permissions.
 */
export const RolePermissions: Record<AuthRole, AuthPermission[]> = {
  [AuthRole._AUTHOR]: [AuthPermission._READ, AuthPermission._EXECUTE, AuthPermission._EDIT, AuthPermission._PUBLISH],
  [AuthRole._OPERATOR]: [AuthPermission._READ, AuthPermission._EXECUTE],
  [AuthRole._ADMIN]: [AuthPermission._READ, AuthPermission._EXECUTE, AuthPermission._EDIT, AuthPermission._PUBLISH, AuthPermission._MANAGE],
};

/**
 * Runtime auth context — represents the effective permissions
 * for a user session or API call.
 */
export interface AuthContext {
  userId: string;
  /** All roles assigned to this user */
  roles: AuthRole[];
  /** Computed permission set (union of all role permissions) */
  permissions: AuthPermission[];
}
