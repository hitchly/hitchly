import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import type { RideMatch } from "@/components/swipe";
import { isTestAccount } from "@/lib/test-accounts";
import { trpc } from "@/lib/trpc";

const MCMASTER_COORDS = { lat: 43.2609, lng: -79.9192 };

export interface RideSearchParams {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  desiredArrivalTime: string;
  desiredDate?: Date;
  maxOccupancy: number;
  preference: "costPriority";
  includeDummyMatches: boolean;
}

export function useRideMatchmaking() {
  const utils = trpc.useUtils();

  const { data: userProfile, isLoading: profileLoading } =
    trpc.profile.getMe.useQuery();
  const isTestUser = isTestAccount(userProfile?.email);

  const [desiredArrivalTime, setDesiredArrivalTime] = useState("09:00");
  const [desiredDate, setDesiredDate] = useState<Date | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [includeDummyMatches, setIncludeDummyMatches] = useState(false);
  const [direction, setDirection] = useState<"toMcmaster" | "fromMcmaster">(
    "toMcmaster"
  );

  const [swipedCardIds, setSwipedCardIds] = useState<Set<string>>(new Set());
  const [swipedCardsLoaded, setSwipedCardsLoaded] = useState(false);

  useEffect(() => {
    const loadSwipedCards = async () => {
      try {
        const stored = await AsyncStorage.getItem("swipedCardIds");
        if (stored) {
          setSwipedCardIds(new Set(JSON.parse(stored) as string[]));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading swiped cards:", error);
      } finally {
        setSwipedCardsLoaded(true);
      }
    };
    void loadSwipedCards();
  }, []);

  useEffect(() => {
    const saveSwipedCards = async () => {
      try {
        const ids = Array.from(swipedCardIds);
        if (ids.length > 0) {
          await AsyncStorage.setItem("swipedCardIds", JSON.stringify(ids));
        } else {
          await AsyncStorage.removeItem("swipedCardIds");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error saving swiped cards:", error);
      }
    };
    void saveSwipedCards();
  }, [swipedCardIds]);

  const searchParams = useMemo<RideSearchParams | null>(() => {
    if (!userProfile?.profile.defaultLat || !userProfile.profile.defaultLong)
      return null;

    const homeCoords = {
      lat: userProfile.profile.defaultLat,
      lng: userProfile.profile.defaultLong,
    };
    const origin = direction === "toMcmaster" ? homeCoords : MCMASTER_COORDS;
    const destination =
      direction === "toMcmaster" ? MCMASTER_COORDS : homeCoords;

    return {
      origin,
      destination,
      desiredArrivalTime,
      desiredDate: desiredDate ?? undefined,
      maxOccupancy: 1,
      preference: "costPriority",
      includeDummyMatches,
    };
  }, [
    userProfile,
    desiredArrivalTime,
    desiredDate,
    includeDummyMatches,
    direction,
  ]);

  // Provide a safe fallback shape to avoid non-null assertions
  const fallbackParams: RideSearchParams = {
    origin: MCMASTER_COORDS,
    destination: MCMASTER_COORDS,
    desiredArrivalTime: "09:00",
    maxOccupancy: 1,
    preference: "costPriority",
    includeDummyMatches: false,
  };

  const matchesQuery = trpc.matchmaking.findMatches.useQuery(
    searchParams ?? fallbackParams,
    {
      enabled: !!searchParams && hasSearched,
      refetchOnMount: true,
    }
  );

  const filteredMatches = useMemo(() => {
    if (!matchesQuery.data || !swipedCardsLoaded)
      return matchesQuery.data ?? [];
    return matchesQuery.data.filter(
      (match) => !swipedCardIds.has(match.rideId)
    );
  }, [matchesQuery.data, swipedCardIds, swipedCardsLoaded]);

  const requestRideMutation = trpc.trip.createTripRequest.useMutation({
    onSuccess: () => {
      void utils.trip.getTripRequests.invalidate();
    },
    // By omitting the explicit type, TypeScript perfectly infers TRPCClientErrorLike
    onError: (error) => {
      setTimeout(() => {
        Alert.alert("Request Failed", error.message);
      }, 500);
    },
  });

  const handleSwipeRight = (match: RideMatch) => {
    if (match.rideId) {
      setSwipedCardIds((prev) => {
        const newSet = new Set(prev).add(match.rideId);
        AsyncStorage.setItem(
          "swipedCardIds",
          JSON.stringify(Array.from(newSet))
          // eslint-disable-next-line no-console
        ).catch(console.error);
        return newSet;
      });
    }

    const matchData = { ...match };
    const searchParamsData = searchParams ? { ...searchParams } : null;

    const handle = requestAnimationFrame(() => {
      if (!searchParamsData || !matchData.rideId) return;

      requestRideMutation.mutate({
        tripId: matchData.rideId,
        pickupLat: searchParamsData.origin.lat,
        pickupLng: searchParamsData.origin.lng,
        estimatedDistanceKm: matchData.details.estimatedDistanceKm,
        estimatedDurationSec: matchData.details.estimatedDurationSec,
        estimatedDetourSec: matchData.details.detourMinutes * 60,
      });
    });

    return () => {
      cancelAnimationFrame(handle);
    };
  };

  const handleSwipeLeft = (match: RideMatch) => {
    if (match.rideId) {
      setSwipedCardIds((prev) => {
        const newSet = new Set(prev).add(match.rideId);
        AsyncStorage.setItem(
          "swipedCardIds",
          JSON.stringify(Array.from(newSet))
          // eslint-disable-next-line no-console
        ).catch(console.error);
        return newSet;
      });
    }
  };

  const resetSearch = async () => {
    setHasSearched(false);
    setDesiredDate(null);
    setIncludeDummyMatches(false);
    setSwipedCardIds(new Set());
    await AsyncStorage.removeItem("swipedCardIds");
  };

  return {
    userProfile,
    profileLoading,
    isTestUser,
    searchParams,
    hasSearched,
    setHasSearched,
    isSearchingMatches: matchesQuery.isLoading,
    hasMatchesData: !!matchesQuery.data,
    filteredMatches,
    formState: {
      desiredArrivalTime,
      setDesiredArrivalTime,
      desiredDate,
      setDesiredDate,
      includeDummyMatches,
      setIncludeDummyMatches,
      direction,
      setDirection,
    },
    handlers: {
      handleSwipeRight,
      handleSwipeLeft,
      resetSearch,
    },
  };
}
