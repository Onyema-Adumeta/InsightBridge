import AppSidebar from "@/components/AppSidebar";

export default function CommentsLayout({
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