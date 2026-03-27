import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import { AppRole, type AppRoleType } from "@/constants/roles";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

interface RoleContextType {
  role: AppRoleType;
  isLoading: boolean;
  isSwitching: boolean;
  setRole: (newRole: AppRoleType, persistToDb?: boolean) => Promise<void>;
  toggleRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRoleState] = useState<AppRoleType>(AppRole.RIDER);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: userProfile } = trpc.profile.getMe.useQuery(undefined, {
    staleTime: Infinity,
  });

  const mutation = trpc.profile.updateAppRole.useMutation();

  useEffect(() => {
    const initRole = async (): Promise<void> => {
      try {
        const userId = session?.user.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        const legacyKey = "@hitchly_user_role";
        const userKey = `@hitchly_user_role:${userId}`;

        const [savedRole, legacyRole] = await Promise.all([
          AsyncStorage.getItem(userKey),
          AsyncStorage.getItem(legacyKey),
        ]);

        const dbRole = userProfile?.profile.appRole as AppRoleType | undefined;
        const isValidRole = (value: string | null): value is AppRoleType =>
          Object.values(AppRole).includes(value as AppRoleType);

        let initialRole: AppRoleType = AppRole.RIDER;

        if (dbRole && isValidRole(dbRole)) {
          initialRole = dbRole;
        } else if (isValidRole(savedRole)) {
          initialRole = savedRole;
        } else if (isValidRole(legacyRole)) {
          initialRole = legacyRole;
        }

        setRoleState(initialRole);
        await AsyncStorage.setItem(userKey, initialRole);

        if (legacyRole) {
          await AsyncStorage.removeItem(legacyKey);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Role initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void initRole();
  }, [session?.user.id, userProfile]);

  const setRole = async (
    newRole: AppRoleType,
    persistToDb = false
  ): Promise<void> => {
    setIsSwitching(true); // Start animation
    setRoleState(newRole);

    const userId = session?.user.id;
    if (userId) {
      const userKey = `@hitchly_user_role:${userId}`;
      await AsyncStorage.setItem(userKey, newRole);
    }

    if (persistToDb) {
      await mutation.mutateAsync({ appRole: newRole });
    }

    router.replace("/");

    // Give the router 500ms to mount the new screens before fading out the overlay
    setTimeout(() => {
      setIsSwitching(false);
    }, 500);
  };

  const toggleRole = async (): Promise<void> => {
    const newRole = role === AppRole.RIDER ? AppRole.DRIVER : AppRole.RIDER;
    await setRole(newRole, true);
  };

  return (
    <RoleContext.Provider
      value={{ role, isLoading, isSwitching, setRole, toggleRole }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useUserRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useUserRole must be used within a RoleProvider");
  }
  return context;
};
