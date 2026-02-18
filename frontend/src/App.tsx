import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import Layout from "./components/Layout";
import LoginPage from "./features/auth/LoginPage";
import KidDashboard from "./features/dashboard/KidDashboard";
import AdminDashboard from "./features/dashboard/AdminDashboard";
import LessonList from "./features/lessons/LessonList";
import LessonViewer from "./features/lessons/LessonViewer";
import ChatWindow from "./features/chat/ChatWindow";
import { SettingsPage } from "./features/Placeholders";
import QuizList from "./features/quiz/QuizList";
import QuizPlayer from "./features/quiz/QuizPlayer";
import ProgressDashboard from "./features/progress/ProgressDashboard";
import JournalList from "./features/journal/JournalList";
import JournalEditor from "./features/journal/JournalEditor";
import CanvasBoard from "./features/canvas/CanvasBoard";
import LessonGenerator from "./features/admin/LessonGenerator";
import ResearchPipeline from "./features/admin/ResearchPipeline";
import ContentReview from "./features/admin/ContentReview";
import CurriculumPlanner from "./features/admin/CurriculumPlanner";
import MathPractice from "./features/math/MathPractice";
import MathPracticeList from "./features/math/MathPracticeList";
import MathPracticeNew from "./features/math/MathPracticeNew";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
}

function Dashboard() {
  const user = useAuthStore((s) => s.user);
  return user?.is_staff ? <AdminDashboard /> : <KidDashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/lessons" element={<LessonList />} />
          <Route path="/lessons/:id" element={<LessonViewer />} />
          <Route path="/lessons/:id/practice" element={<MathPractice />} />
          <Route path="/math-practice" element={<MathPracticeList />} />
          <Route path="/math-practice/new" element={<MathPracticeNew />} />
          <Route path="/math-practice/:sessionId" element={<MathPractice />} />
          <Route path="/chat" element={<ChatWindow />} />
          <Route path="/quizzes" element={<QuizList />} />
          <Route path="/quizzes/:id" element={<QuizPlayer />} />
          <Route path="/journal" element={<JournalList />} />
          <Route path="/journal/:id" element={<JournalEditor />} />
          <Route path="/canvas" element={<CanvasBoard />} />
          <Route path="/progress" element={<ProgressDashboard />} />
          <Route path="/admin/generate" element={<LessonGenerator />} />
          <Route path="/admin/research" element={<ResearchPipeline />} />
          <Route path="/admin/review" element={<ContentReview />} />
          <Route path="/admin/curriculum" element={<CurriculumPlanner />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
