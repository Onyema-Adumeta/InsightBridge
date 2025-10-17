import Link from "next/link";

interface UploadCardProps {
  id: number;
  filename: string;
  summary: string;
  uploadedAt: string;
}

export default function UploadCard({ id, filename, summary, uploadedAt }: UploadCardProps) {
  return (
    <div className="border rounded p-4 shadow hover:bg-gray-50 transition">
      <p className="font-semibold">{filename}</p>
      <p className="text-sm text-gray-600">Uploaded: {uploadedAt}</p>
      <p className="text-sm text-gray-700 mt-2">
        {summary?.slice(0, 150)}...
      </p>
      <Link
        href={`/csv-logs/${id}`}
        className="text-blue-600 hover:underline text-sm mt-2 inline-block"
      >
        🔍 View Details →
      </Link>
    </div>
  );
}
