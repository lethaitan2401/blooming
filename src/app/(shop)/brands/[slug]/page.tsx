import { redirect } from "next/navigation";

export default async function BrandRedirect(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  redirect(`/products?brand=${slug}`);
}
