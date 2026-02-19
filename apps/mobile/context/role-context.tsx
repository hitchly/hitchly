import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import { AppRole, type AppRoleType } from "@/constants/roles";
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

  const { data: userProfile } = trpc.profile.getMe.useQuery(undefined, {
    staleTime: Infinity,
  });

  const mutation = trpc.profile.updateAppRole.useMutation();

  useEffect(() => {
    const initRole = async (): Promise<void> => {
      try {
        const savedRole = await AsyncStorage.getItem("@hitchly_user_role");
        const dbRole = userProfile?.profile.appRole as AppRoleType | undefined;
        const isValidSavedRole = Object.values(AppRole).includes(
          savedRole as AppRoleType
        );

        if (isValidSavedRole) {
          setRoleState(savedRole as AppRoleType);
        } else if (dbRole) {
          setRoleState(dbRole);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Role initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void initRole();
  }, [userProfile]);

  const setRole = async (
    newRole: AppRoleType,
    persistToDb = false
  ): Promise<void> => {
    setIsSwitching(true); // Start animation

    setRoleState(newRole);
    await AsyncStorage.setItem("@hitchly_user_role", newRole);

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
