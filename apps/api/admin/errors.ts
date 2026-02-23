export class NotFoundError extends Error {
  name: string = "NotFoundError";

  constructor(object: any) {
    super(`"${object}" not found.`);
  }
}

export class InsufficientAdminPrivileges extends Error {
  name: string = "InsufficientAdminPrivileges";

  constructor(adminId: any) {
    super(`Admin with ID "${adminId}" has insufficient privileges.`);
  }
}
