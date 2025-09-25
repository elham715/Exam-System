import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-neutral-800 p-8 animate-fade-in">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
        {/* Add a sign out button here later */}
      </header>
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <DashboardCard
          title="Manage Question Sets"
          description="Create and organize questions into distinct sets."
          link="/admin/question-sets"
        />
        <DashboardCard
          title="Create Exam"
          description="Build a new exam by selecting from the question bank."
          link="/admin/exams/new"
        />
        <DashboardCard
          title="Manage Exams"
          description="Generate shareable exam links from your question sets."
          link="/admin/exams"
        />
      </main>
    </div>
  );
}

function DashboardCard({ title, description, link }) {
  return (
    <Link href={link}>
      <div className="bg-neutral-900 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-2 cursor-pointer">
        <h2 className="text-2xl font-bold text-secondary mb-2">{title}</h2>
        <p className="text-neutral-300">{description}</p>
      </div>
    </Link>
  );
}
