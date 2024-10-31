import { Home } from "@/components/home";
import { ServerError } from "@/components/server-error";

export default async function HomePage() {
  try {
    return <Home />;
  } catch (e) {
    return <ServerError error={e} />;
  }
}
