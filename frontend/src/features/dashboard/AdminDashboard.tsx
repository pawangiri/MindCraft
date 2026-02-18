import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import api from "../../api/client";
import { Users, BookOpen, ClipboardList, MessageCircle, ExternalLink, Sparkles, Search, FileCheck } from "lucide-react";

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState({ kids: 0, lessons: 0, subjects: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/lessons/").then((r) => {
        const data = r.data.results || r.data;
        setStats((s) => ({ ...s, lessons: data.length }));
      }),
      api.get("/subjects/").then((r) => {
        setStats((s) => ({ ...s, subjects: r.data.length }));
      }),
    ]).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Welcome back, {user?.first_name || "Parent"}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your MindCraft overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <Users className="w-6 h-6 text-blue-500 mb-2" />
          <div className="text-2xl font-bold">3</div>
          <div className="text-sm text-gray-500">Kids</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <BookOpen className="w-6 h-6 text-green-500 mb-2" />
          <div className="text-2xl font-bold">{stats.lessons}</div>
          <div className="text-sm text-gray-500">Lessons</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <ClipboardList className="w-6 h-6 text-purple-500 mb-2" />
          <div className="text-2xl font-bold">{stats.subjects}</div>
          <div className="text-sm text-gray-500">Subjects</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <MessageCircle className="w-6 h-6 text-amber-500 mb-2" />
          <div className="text-2xl font-bold">—</div>
          <div className="text-sm text-gray-500">Chat Sessions</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="http://localhost:8000/admin/"
            target="_blank"
            rel="noreferrer"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="font-semibold group-hover:text-primary-600 transition-colors">
                Django Admin Panel
              </div>
              <div className="text-sm text-gray-500">
                Manage content, users, and view all data
              </div>
            </div>
          </a>

          <Link
            to="/admin/generate"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <div className="font-semibold group-hover:text-accent-600 transition-colors">
                AI Lesson Generator
              </div>
              <div className="text-sm text-gray-500">
                Generate educational lessons with AI
              </div>
            </div>
          </Link>

          <Link
            to="/admin/research"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold group-hover:text-blue-600 transition-colors">
                Research Lab
              </div>
              <div className="text-sm text-gray-500">
                Research topics and create enriched lessons
              </div>
            </div>
          </Link>

          <Link
            to="/admin/review"
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="font-semibold group-hover:text-green-600 transition-colors">
                Content Review
              </div>
              <div className="text-sm text-gray-500">
                Review and publish AI-generated lessons
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Login info */}
      <div className="bg-blue-50 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-800 mb-2">🔑 Kid Accounts</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Alex</strong> (Grade 3): alex / alex123</p>
          <p>• <strong>Sam</strong> (Grade 6): sam / sam123</p>
          <p>• <strong>Jordan</strong> (Grade 9): jordan / jordan123</p>
        </div>
        <p className="text-xs text-blue-500 mt-2">
          You can manage these in the Django admin panel.
        </p>
      </div>
    </div>
  );
}
