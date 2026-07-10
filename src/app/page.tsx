import { redirect } from "next/navigation";

// La raíz siempre lleva al portal; el proxy ya filtra la sesión.
export default function Home() {
  redirect("/inicio");
}
