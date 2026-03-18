import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import * as z from "zod";

import { McMaster } from "@/constants/location";
import { trpc } from "@/lib/trpc";

const TIME_WINDOW_MIN = 15;

const getMinDepartureTime = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + TIME_WINDOW_MIN);
  return d;
};

const createTripSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  departureTime: z.date().refine((date) => date >= getMinDepartureTime(), {
    message: `Departure must be at least ${TIME_WINDOW_MIN} minutes in the future`,
  }),
  maxSeats: z.number().min(1).max(5),

  // Recurring fields
  isRecurring: z.boolean().default(false),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
});

export type CreateTripFormData = z.infer<typeof createTripSchema>;

export function useCreateTrip() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isToCampus, setIsToCampus] = useState(new Date().getHours() < 12);
  const prevIsToCampusRef = useRef(isToCampus);

  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const defaultAddress = userProfile?.profile.defaultAddress ?? "";

  const methods = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema) as any,
    mode: "onChange",
    defaultValues: {
      origin: "",
      destination: "",
      departureTime: getMinDepartureTime(),
      maxSeats: 1,
      isRecurring: false,
      daysOfWeek: [],
    },
  });

  const { setValue, getValues } = methods;

  // Only overwrite origin/destination when the user changes direction (TO/FROM MCMASTER).
  // This prevents overwriting a custom drop-off like "union station" when defaultAddress loads.
  useEffect(() => {
    if (prevIsToCampusRef.current !== isToCampus) {
      prevIsToCampusRef.current = isToCampus;
      if (isToCampus) {
        setValue("origin", defaultAddress, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue("destination", McMaster.address, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        setValue("origin", McMaster.address, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue("destination", defaultAddress, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  }, [isToCampus, defaultAddress, setValue]);

  // When defaultAddress first loads, fill only fields that are still empty so we don't overwrite e.g. "union station".
  useEffect(() => {
    const { origin, destination } = getValues();
    const originEmpty = origin === "" || origin === undefined;
    const destEmpty = destination === "" || destination === undefined;
    if (!originEmpty && !destEmpty) return;
    if (isToCampus) {
      if (originEmpty) setValue("origin", defaultAddress);
      if (destEmpty) setValue("destination", McMaster.address);
    } else {
      if (originEmpty) setValue("origin", McMaster.address);
      if (destEmpty) setValue("destination", defaultAddress);
    }
  }, [defaultAddress, isToCampus, setValue, getValues]);

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

  const createScheduleMutation = trpc.recurringSchedule.create.useMutation({
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const generateNextTripForScheduleMutation =
    trpc.recurringSchedule.generateNextTripForSchedule.useMutation({
      onError: (err) => {
        Alert.alert("Error", err.message);
      },
    });

  const onSubmit = async (data: CreateTripFormData) => {
    if (data.isRecurring && data.daysOfWeek && data.daysOfWeek.length > 0) {
      const schedule = await createScheduleMutation.mutateAsync({
        origin: data.origin,
        destination: data.destination,
        departureTime: data.departureTime,
        maxSeats: data.maxSeats,
        daysOfWeek: data.daysOfWeek,
      });

      if (schedule?.id) {
        await generateNextTripForScheduleMutation.mutateAsync({
          recurringScheduleId: schedule.id,
          after: new Date(),
        });
      }

      await utils.trip.getTrips.invalidate();
      Alert.alert("Success", "Recurring ride scheduled!");
      router.back();
    } else {
      createTripMutation.mutate({
        origin: data.origin,
        destination: data.destination,
        departureTime: data.departureTime,
        maxSeats: data.maxSeats,
      });
    }
  };

  return {
    methods,
    isToCampus,
    setIsToCampus,
    defaultAddress,
    isPending:
      createTripMutation.isPending ||
      createScheduleMutation.isPending ||
      generateNextTripForScheduleMutation.isPending,
    onSubmit: methods.handleSubmit(onSubmit as any),
  };
}
