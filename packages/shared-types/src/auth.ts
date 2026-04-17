// Auth types for role-based access control

/**
 * Three-layer role model for Prism Editor.
 * Matches P1-5 requirement: author / operator / admin.
 */
export enum AuthRole {
  /** Can create, edit, and publish workflows */
  AUTHOR = 'author',
  /** Can read and execute published workflows (default for all users) */
  OPERATOR = 'operator',
  /** Full platform administration access */
  ADMIN = 'admin',
}

/**
 * Granular permissions within the platform.
 * Roles are assigned permission sets via RolePermissions.
 */
export enum AuthPermission {
  READ = 'read',
  EXECUTE = 'execute',
  EDIT = 'edit',
  PUBLISH = 'publish',
  MANAGE = 'manage',
}

/**
 * Permission set for each built-in role.
 * Maps role -> set of permissions.
 */
export const RolePermissions: Record<AuthRole, AuthPermission[]> = {
  [AuthRole.AUTHOR]: [AuthPermission.READ, AuthPermission.EXECUTE, AuthPermission.EDIT, AuthPermission.PUBLISH],
  [AuthRole.OPERATOR]: [AuthPermission.READ, AuthPermission.EXECUTE],
  [AuthRole.ADMIN]: [AuthPermission.READ, AuthPermission.EXECUTE, AuthPermission.EDIT, AuthPermission.PUBLISH, AuthPermission.MANAGE],
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
