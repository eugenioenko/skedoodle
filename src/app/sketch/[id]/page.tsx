import { App } from "@/components/app";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SketchPage({ params }: PageProps) {
  const { id } = await params;

  return <App sketchId={id} />;
}
