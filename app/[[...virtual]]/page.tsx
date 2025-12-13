import CsvViewerApp from "@/components/CsvViewerApp";

type PageProps = {
  params: {
    virtual?: string[];
  };
  searchParams: {
    virtual?: string;
    dir?: string;
  };
};

export const dynamic = "force-dynamic";

export default function CsvViewerPage({ params, searchParams }: PageProps) {
  const rawSegments = params.virtual ?? [];
  const fromParams = rawSegments.length
    ? `/${rawSegments.map((segment) => decodeURIComponent(segment)).join("/")}`
    : null;
  const fromSearch = normalizeVirtual(searchParams.virtual);
  const virtualPath = fromSearch ?? fromParams;
  const initialDirectory = searchParams.dir ?? null;

  return <CsvViewerApp initialVirtualPath={virtualPath} initialServerPath={initialDirectory} />;
}

function normalizeVirtual(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
