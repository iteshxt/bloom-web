import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadHomeSeed } from "@/lib/dashboard/seed";
import { HomeScreen } from "./HomeScreen";

// Home (design §11.3). A fresh page load is rendered on the server with
// the dashboard data, so the screen paints from the HTML instead of
// waiting for the JavaScript and then its own data requests. A tab switch
// inside the app already has the data in the browser's cache, so it skips
// the server read and shows at once.

export default function Page() {
  return (
    <Suspense fallback={<HomeScreen />}>
      <SeededHome />
    </Suspense>
  );
}

async function SeededHome() {
  // Per request: the read depends on the session and the time.
  await connection();
  const navigating = (await headers()).get("rsc") === "1";
  const seed = navigating ? null : await loadHomeSeed();
  return <HomeScreen seed={seed} />;
}
