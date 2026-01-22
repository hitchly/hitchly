import { auth } from "../auth/auth";
import { db } from "@hitchly/db/client";
import { UserRecord } from "@hitchly/db/client/types/records/user_record";
import { NotFoundError, InsufficientAdminPrivileges } from "./errors";

export const warning_threshold = 3;

// Adds a new record with a warning in the reports table
// Throws NotFoundError if user_ID does not exist
// Throws InsufficentAdminPrivileges
export function warn_user(user_ID: number, reason: any): boolean {
  if (db.getAllRecords("users", { id: user_ID }).length === 0) {
    throw new NotFoundError(user_ID);
  }

  try {
    db.addRecord("reports", {
      user_id: user_ID,
      reason: reason,
    });
  } catch (e) {
    // Failed to warn user
    return false;
  }

  return true;
}

// Returns a dataset of user reports
// Throws NotFoundError if no reports exist
// Throws InsufficentAdminPrivileges
export function get_Reports(): Array<UserRecord> {
  // Auth module has no way to obtain the current user ID atm
  // if (!check_privileges(user_ID, endpoint)) {
  //     throw new InsufficientAdminPrivileges(user_ID);
  // }

  const reports = db.getAllRecords("reports");

  if (reports.length === 0) {
    throw new NotFoundError("No reports found");
  }

  return reports;
}

// Returns a dataset of user and app statistics
// Throws NotFoundError if no reports exist
// Throws InsufficentAdminPrivileges
export function get_analytics(): Array<any> {
  // Auth module has no way to obtain the current user ID atm
  // if (!check_privileges(user_ID, endpoint)) {
  //     throw new InsufficientAdminPrivileges(user_ID);
  // }

  const stats = db.getAllRecords("statistics");

  if (stats.length === 0) {
    throw new NotFoundError("No statistics found");
  }

  return stats;
}

// Checks if the admin_ID has sufficient privileges to access the endpoint
function check_privileges(admin_ID: number, endpoint: any): boolean {
  return db.getRecord("admins", admin_ID).privileges.includes(endpoint);
}
