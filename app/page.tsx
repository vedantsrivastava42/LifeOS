import { redirect } from "next/navigation";

export default function Home() {
  // Middleware gates auth; Today is the home surface.
  redirect("/today");
}
