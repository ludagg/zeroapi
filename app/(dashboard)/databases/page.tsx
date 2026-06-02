import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The standalone "Bases de données" section was retired — each database now
 * lives in its job's "Base de données" tab. Old links land on the job list.
 */
export default function DatabasesRedirect() {
  redirect("/jobs");
}
