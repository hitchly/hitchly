import {
  type IdentityVerificationSheetOptions,
  useStripeIdentity,
} from "@stripe/stripe-identity-react-native";
import { Image } from "react-native";

import favicon from "@/assets/images/favicon.png";
import { trpc } from "@/lib/trpc";

export const useDriverVerification = () => {
  const { mutateAsync: createSession } =
    trpc.identity.createVerificationSession.useMutation();

  const fetchOptions = async (): Promise<IdentityVerificationSheetOptions> => {
    const response = (await createSession()) as {
      sessionId: string;
      ephemeralKeySecret: string;
    };

    const resolvedLogo = Image.resolveAssetSource(favicon);

    return {
      sessionId: response.sessionId,
      ephemeralKeySecret: response.ephemeralKeySecret,
      brandLogo: resolvedLogo,
    };
  };

  const {
    present,
    status,
    loading: isStripeLoading,
    error,
  } = useStripeIdentity(fetchOptions);

  return {
    present,
    status,
    error,
    isLoading: isStripeLoading,
  };
};
