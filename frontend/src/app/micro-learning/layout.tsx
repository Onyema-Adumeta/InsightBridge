import AppSidebar from "@/components/AppSidebar";

export default function MicroLearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppSidebar />
      {children}
    </>
  );
}