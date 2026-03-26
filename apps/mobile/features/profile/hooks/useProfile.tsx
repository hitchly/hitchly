import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useProfile() {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const {
    data: userRecord,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.profile.getMe.useQuery();

  const { data: ratingData, refetch: refetchRating } =
    trpc.reviews.getUserScore.useQuery(
      { userId: session?.user.id ?? "" },
      {
        enabled: (session?.user.id ?? "") !== "",
        refetchOnMount: "always",
        refetchOnReconnect: true,
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
      }
    );

  const isDriver = ["driver", "both"].includes(
    userRecord?.profile.appRole ?? "rider"
  );

  const { data: earnings } = trpc.profile.getDriverEarnings.useQuery(
    undefined,
    {
      enabled: isDriver,
    }
  );

  const handleRefresh = (): void => {
    void refetch();
    void refetchRating();
  };

  const onSuccess = (): void => {
    void utils.profile.getMe.invalidate();
  };

  return {
    session,
    userRecord,
    ratingData,
    earnings,
    isLoading,
    isRefetching,
    isDriver,
    handleRefresh,
    onSuccess,
  };
}
