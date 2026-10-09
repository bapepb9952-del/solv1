import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Dojo OS", short_name: "Dojo OS", description: "Constância no tatame.", lang: "pt-BR", start_url: "/academies", display: "standalone", background_color: "#f5f6f2", theme_color: "#17231f", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
