import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./trpc/routers";
import type { RiderProfile } from "./services/matchmaking_service";

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      // URL of running API server
      url: "http://localhost:3000/trpc",
    }),
  ],
});

const testRider1: RiderProfile = {
  id: "test-rider-1",
  origin: { lat: 43.255, lng: -79.9 }, // A test location in Hamilton
  destination: { lat: 43.2609, lng: -79.9192 }, // McMaster
  desiredArrivalTime: "08:45",
  maxOccupancy: 3, // They are willing to be in a car with 3 people total
};

const testRider2: RiderProfile = {
  id: "test-rider-2",
  origin: { lat: 43.09363, lng: -80.44377 },
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "11:45",
  maxOccupancy: 2,
};

const testRider3: RiderProfile = {
  id: "test-rider-3",
  origin: { lat: 43.80225, lng: -79.26099 },
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "13:35",
  maxOccupancy: 1,
};

const testRider4: RiderProfile = {
  id: "test-rider-4",
  origin: { lat: 43.432035, lng: -79.776309 },
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:45",
  maxOccupancy: 4,
};

const allTestRiders = [testRider1, testRider2, testRider3, testRider4];

async function runTest() {
  console.log(`🚀 Starting tests for ${allTestRiders.length} riders...`);

  for (const rider of allTestRiders) {
    console.log(`\n------------------------------------------`);
    console.log(`🚀 Sending test request for rider: ${rider.id}...`);

    try {
      const result = await trpc.matchmaking.findMatches.query(rider);

      console.log("\n✅ Test client received success!");
      console.log("This is the raw data returned to the client:");
      console.log(result);
    } catch (error) {
      console.error("\n❌ Test Failed:");
      console.error(error);
    }
  }

  console.log(`\n------------------------------------------`);
  console.log("✅ All tests complete.");
}

runTest();
