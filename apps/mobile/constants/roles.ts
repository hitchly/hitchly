export const AppRole = {
  RIDER: "rider",
  DRIVER: "driver",
} as const;

export type AppRoleType = (typeof AppRole)[keyof typeof AppRole];

export const ROLE_ROUTES: Record<AppRoleType, "/rider" | "/driver"> = {
  [AppRole.RIDER]: "/rider",
  [AppRole.DRIVER]: "/driver",
};
