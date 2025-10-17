"use client";

export default function EnvCheck() {
  return (
    <div className="text-xs text-gray-400 mt-2">
      ✅ <strong>NEXT_PUBLIC_API_URL:</strong>{" "}
      <code>{process.env.NEXT_PUBLIC_API_URL}</code>
    </div>
  );
}
