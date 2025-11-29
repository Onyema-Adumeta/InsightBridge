import AppSidebar from "@/components/AppSidebar";

export default function WorkflowsLayout({
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