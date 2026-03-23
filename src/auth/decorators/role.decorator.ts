import { SetMetadata } from '@nestjs/common';

// Application roles
export type AppRole = 'ADMIN' | 'OPERATOR';

export const ROLES_KEY = 'roles';

export const Role = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

