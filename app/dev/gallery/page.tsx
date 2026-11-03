import { notFound } from "next/navigation";
import { Gallery } from "./Gallery";

// Development only: every sky band, flower stage, companion mood and icon
// on one page, for checking the art (design §16.4) without game data.
export default function GalleryPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Gallery />;
}
