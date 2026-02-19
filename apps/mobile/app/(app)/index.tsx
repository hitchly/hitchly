import { Redirect } from "expo-router";

import { ROLE_ROUTES } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";

export default function AppIndex() {
  const { role, isLoading } = useUserRole();

  if (isLoading) return null;

  return <Redirect href={ROLE_ROUTES[role]} />;
}
