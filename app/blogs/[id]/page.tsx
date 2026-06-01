import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

// Blog detail is unavailable until the database is connected.
export default async function BlogPage({ params }: PageProps) {
    await params; // consume params to avoid lint warning
    return notFound();
}
