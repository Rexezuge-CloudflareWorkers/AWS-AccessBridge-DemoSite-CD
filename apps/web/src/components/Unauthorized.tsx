'use client';

export default function Unauthorized() {
  return (
    <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-400 mb-4">401</h1>
        <h2 className="text-2xl font-semibold mb-4">Unauthorized</h2>
        <p className="text-gray-400 mb-8">You are not authorized to access this application. Please log in to continue.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
