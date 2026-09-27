import { UserOnboardingPayload } from "../../infrastructure/sqs/sqs.types";
import onboardServices from "../../onboard/onboard.services";

export async function userOnboardingHandler(payload: UserOnboardingPayload) {
    const { userId } = payload;
    await onboardServices.initializeUser(userId);
    console.log(`User onboarding completed for userId: ${userId}`);
}
