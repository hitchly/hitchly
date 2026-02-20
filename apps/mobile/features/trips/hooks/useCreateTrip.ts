import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import * as z from "zod";

import { McMaster } from "@/constants/location";
import { trpc } from "@/lib/trpc";

const createTripSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  departureTime: z.date().refine((date) => date > new Date(), {
    message: "Departure must be in the future",
  }),
  maxSeats: z.number().min(1).max(5),
});

export type CreateTripFormData = z.infer<typeof createTripSchema>;

export function useCreateTrip() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isToCampus, setIsToCampus] = useState(new Date().getHours() < 12);

  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const defaultAddress = userProfile?.profile.defaultAddress ?? "";

  const methods = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      origin: "",
      destination: "",
      departureTime: new Date(Date.now() + 15 * 60 * 1000),
      maxSeats: 1,
    },
  });

  const { setValue } = methods;

  useEffect(() => {
    if (isToCampus) {
      setValue("origin", defaultAddress);
      setValue("destination", McMaster.address);
    } else {
      setValue("origin", McMaster.address);
      setValue("destination", defaultAddress);
    }
  }, [isToCampus, defaultAddress, setValue]);

  const createTripMutation = trpc.trip.createTrip.useMutation({
    onSuccess: () => {
      void utils.trip.getTrips.invalidate();
      Alert.alert("Success", "Trip posted!");
      router.back();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const onSubmit = (data: CreateTripFormData) => {
    createTripMutation.mutate(data);
  };

  return {
    methods,
    isToCampus,
    setIsToCampus,
    defaultAddress,
    isPending: createTripMutation.isPending,
    onSubmit: methods.handleSubmit(onSubmit),
  };
}
