import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen transform -translate-y-10">
      {/* SVG Image */}
      <div className="w-2/3 md:w-1/2 lg:w-1/3">
        <img src="/404_error.svg" alt="404 Not Found" />
      </div>

      {/* Button on Next Line */}
      <div className="mt-6">
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition"
      >
        Go Back Home
      </Link>

      </div>
    </div>
  );
}
