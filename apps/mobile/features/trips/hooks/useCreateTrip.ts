import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { McMaster } from "@/constants/location";
import { trpc } from "@/lib/trpc";

interface CreateTripFormState {
  origin: string;
  destination: string;
  departureDateTime: Date;
  availableSeats: number;
}

interface UseCreateTripReturn {
  form: CreateTripFormState;
  errors: Record<string, string>;
  isToCampus: boolean;
  defaultAddress: string;
  isPending: boolean;
  toggleDirection: (toCampus: boolean) => void;
  updateForm: <K extends keyof CreateTripFormState>(
    key: K,
    value: CreateTripFormState[K]
  ) => void;
  handleSubmit: () => void;
}

export function useCreateTrip(): UseCreateTripReturn {
  const router = useRouter();
  const utils = trpc.useUtils();

  const currentHour = new Date().getHours();
  const defaultToCampus = currentHour < 12;

  const [isToCampus, setIsToCampus] = useState(defaultToCampus);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CreateTripFormState>({
    origin: "",
    destination: "",
    departureDateTime: new Date(Date.now() + 15 * 60 * 1000),
    availableSeats: 1,
  });

  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const defaultAddress = userProfile?.profile.defaultAddress ?? "";

  useEffect(() => {
    if (isToCampus) {
      setForm((prev) => ({
        ...prev,
        origin: defaultAddress,
        destination: McMaster.address,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        origin: McMaster.address,
        destination: defaultAddress,
      }));
    }
  }, [isToCampus, defaultAddress]);

  const toggleDirection = (toCampus: boolean) => {
    setIsToCampus(toCampus);
    setErrors({});
  };

  const updateForm = <K extends keyof CreateTripFormState>(
    key: K,
    value: CreateTripFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.origin.trim()) newErrors.origin = "Origin is required";
    if (!form.destination.trim())
      newErrors.destination = "Destination is required";

    const minDepartureTime = new Date(Date.now() + 15 * 60 * 1000);
    if (form.departureDateTime < minDepartureTime) {
      newErrors.departureDateTime =
        "Departure must be at least 15 mins in the future";
    }

    if (form.availableSeats < 1 || form.availableSeats > 5) {
      newErrors.availableSeats = "Available seats must be between 1 and 5";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createTripMutation = trpc.trip.createTrip.useMutation({
    onSuccess: () => {
      void utils.trip.getTrips.invalidate();
      Alert.alert("Success", "Trip created successfully!", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSubmit = () => {
    if (!validateForm()) return;

    createTripMutation.mutate({
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      departureTime: form.departureDateTime,
      maxSeats: form.availableSeats,
    });
  };

  return {
    form,
    errors,
    isToCampus,
    defaultAddress,
    isPending: createTripMutation.isPending,
    toggleDirection,
    updateForm,
    handleSubmit,
  };
}
