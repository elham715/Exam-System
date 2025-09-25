import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex items-center justify-center min-h-screen animate-fade-in">
      <div className="text-center p-8 bg-neutral-800 rounded-lg shadow-2xl">
        <h1 className="text-5xl font-bold text-white mb-4">Welcome to the Exam System</h1>
        <p className="text-neutral-300 mb-8">The modern way to manage and conduct examinations.</p>
        <Link href="/login">
          <span className="px-8 py-3 bg-secondary text-white font-semibold rounded-lg shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 cursor-pointer">
            Admin Login
          </span>
        </Link>
      </div>
    </main>
  );
}
