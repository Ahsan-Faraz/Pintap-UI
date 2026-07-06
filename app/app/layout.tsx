import RecommenderShell from "@/components/recommender/RecommenderShell";

export default function RecommenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RecommenderShell>{children}</RecommenderShell>;
}
