import React from "react";
import AppSidebar from "@/components/AppSidebar";

export default function UploadLayout({
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