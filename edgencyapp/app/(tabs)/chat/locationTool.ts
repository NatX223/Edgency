import { z } from "zod";
import * as Location from "expo-location";

export const locationTool = {
  name: "get_user_location",
  description: "Get the user's current GPS coordinates and a human-readable address.",
  parameters: z.object({ name: z.string().describe("the name of the user") }),
  handler: async (_args: Record<string, unknown>) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return { error: "Location permission denied." };
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      let address = "Address unavailable";
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          address = [geo.streetNumber, geo.street, geo.district, geo.city, geo.region].filter(Boolean).join(", ") || "Address unavailable";
        }
      } catch (_) {
        console.warn("[Location] reverseGeocodeAsync unavailable, returning coordinates only");
      }
      return { latitude, longitude, address };
    } catch (e: any) {
      return { error: `Location lookup failed: ${e?.message ?? String(e)}` };
    }
  },
};
