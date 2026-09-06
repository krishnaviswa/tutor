import { redirect } from "next/navigation";

/** Product home is the catalog role router — not an operator dump of 47 ids. */
export default function Home() {
  redirect("/app/student/router");
}
