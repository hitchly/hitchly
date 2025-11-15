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
  origin: { lat: 43.09363, lng: -80.44377 }, // Brantford, Ontario
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "11:45",
  maxOccupancy: 2,
};

const testRider3: RiderProfile = {
  id: "test-rider-3",
  origin: { lat: 43.80225, lng: -79.26099 }, // Markham, Ontario
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "13:35",
  maxOccupancy: 1,
};

const testRider4: RiderProfile = {
  id: "test-rider-4",
  origin: { lat: 43.432035, lng: -79.776309 }, // Oakville, Ontario
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:45",
  maxOccupancy: 4,
};

const testRider5: RiderProfile = {
  id: "test-rider-5",
  origin: { lat: 43.238, lng: -79.885 }, // Downtown Hamilton, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:30",
  maxOccupancy: 3,
};

const testRider6: RiderProfile = {
  id: "test-rider-6",
  origin: { lat: 43.217, lng: -79.828 }, // Stoney Creek, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:15",
  maxOccupancy: 2,
};

const testRider7: RiderProfile = {
  id: "test-rider-7",
  origin: { lat: 43.312, lng: -79.885 }, // Dundas, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "10:00",
  maxOccupancy: 4,
};

const testRider8: RiderProfile = {
  id: "test-rider-8",
  origin: { lat: 43.336, lng: -79.807 }, // Burlington, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "07:45",
  maxOccupancy: 3,
};

const testRider9: RiderProfile = {
  id: "test-rider-9",
  origin: { lat: 43.479, lng: -79.698 }, // Oakville North, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:30",
  maxOccupancy: 2,
};

const testRider10: RiderProfile = {
  id: "test-rider-10",
  origin: { lat: 43.518, lng: -79.879 }, // Milton, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:15",
  maxOccupancy: 4,
};

const testRider11: RiderProfile = {
  id: "test-rider-11",
  origin: { lat: 43.165, lng: -79.623 }, // Grimsby, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:50",
  maxOccupancy: 3,
};

const testRider12: RiderProfile = {
  id: "test-rider-12",
  origin: { lat: 43.085, lng: -79.083 }, // Niagara Falls, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "10:45",
  maxOccupancy: 1,
};

const testRider13: RiderProfile = {
  id: "test-rider-13",
  origin: { lat: 43.595, lng: -79.640 }, // Mississauga, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:50",
  maxOccupancy: 3,
};

const testRider14: RiderProfile = {
  id: "test-rider-14",
  origin: { lat: 43.654, lng: -79.383 }, // Toronto Downtown, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:40",
  maxOccupancy: 2,
};

const testRider15: RiderProfile = {
  id: "test-rider-15",
  origin: { lat: 43.720, lng: -79.450 }, // North York, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:55",
  maxOccupancy: 4,
};

const testRider16: RiderProfile = {
  id: "test-rider-16",
  origin: { lat: 43.772, lng: -79.501 }, // Vaughan, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "11:20",
  maxOccupancy: 2,
};

const testRider17: RiderProfile = {
  id: "test-rider-17",
  origin: { lat: 43.200, lng: -79.980 }, // Ancaster, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "07:55",
  maxOccupancy: 3,
};

const testRider18: RiderProfile = {
  id: "test-rider-18",
  origin: { lat: 43.250, lng: -79.730 }, // Winona, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:10",
  maxOccupancy: 2,
};

const testRider19: RiderProfile = {
  id: "test-rider-19",
  origin: { lat: 43.037, lng: -79.940 }, // Caledonia, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:05",
  maxOccupancy: 3,
};

const testRider20: RiderProfile = {
  id: "test-rider-20",
  origin: { lat: 43.006, lng: -79.625 }, // Smithville, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "10:25",
  maxOccupancy: 2,
};

const testRider21: RiderProfile = {
  id: "test-rider-21",
  origin: { lat: 43.220, lng: -79.950 }, // Meadowlands, Ancaster, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:00",
  maxOccupancy: 3,
};

const testRider22: RiderProfile = {
  id: "test-rider-22",
  origin: { lat: 43.260, lng: -79.890 }, // Westdale, Hamilton, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:40",
  maxOccupancy: 2,
};

const testRider23: RiderProfile = {
  id: "test-rider-23",
  origin: { lat: 43.180, lng: -79.710 }, // Beamsville, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "07:35",
  maxOccupancy: 3,
};

const testRider24: RiderProfile = {
  id: "test-rider-24",
  origin: { lat: 43.420, lng: -79.820 }, // East Burlington, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "16:05",
  maxOccupancy: 4,
};

const testRider25: RiderProfile = {
  id: "test-rider-25",
  origin: { lat: 43.610, lng: -79.590 }, // Mississauga South, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "18:00",
  maxOccupancy: 2,
};

const testRider26: RiderProfile = {
  id: "test-rider-26",
  origin: { lat: 43.150, lng: -80.020 }, // Jerseyville, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "18:25",
  maxOccupancy: 3,
};

const testRider27: RiderProfile = {
  id: "test-rider-27",
  origin: { lat: 43.340, lng: -79.930 }, // Waterdown, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "09:10",
  maxOccupancy: 4,
};

const testRider28: RiderProfile = {
  id: "test-rider-28",
  origin: { lat: 43.550, lng: -79.720 }, // Erin Mills, Mississauga, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "19:55",
  maxOccupancy: 2,
};

const testRider29: RiderProfile = {
  id: "test-rider-29",
  origin: { lat: 43.420, lng: -79.730 }, // Glen Abbey, Oakville, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "7:25",
  maxOccupancy: 3,
};

const testRider30: RiderProfile = {
  id: "test-rider-30",
  origin: { lat: 43.250, lng: -79.860 }, // Corktown, Hamilton, ON
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "12:50",
  maxOccupancy: 2,
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
