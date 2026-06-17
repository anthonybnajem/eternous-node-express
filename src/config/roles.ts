const allRoles = {
  user: ['getUsers', 'manageUsers'],
  admin: ['getUsers', 'manageUsers', 'getProducts', 'manageProducts', 'getOrders', 'manageOrders'],
} as const;

export type Role = keyof typeof allRoles;
export type Permission = (typeof allRoles)[Role][number];

const roles = Object.keys(allRoles) as Role[];
const roleRights = new Map<Role, readonly Permission[]>(Object.entries(allRoles) as [Role, readonly Permission[]][]);

export { roles, roleRights };
export default { roles, roleRights };
