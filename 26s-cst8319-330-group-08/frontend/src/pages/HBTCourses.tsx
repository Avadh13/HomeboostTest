import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type Course = {
  id: number;
  title: string;
  description?: string | null;
  progress?: { percent: number; completed_lessons: number; total_lessons: number };
};

type Module = { id: number; course_id: number; title: string; description?: string | null };
type Lesson = { id: number; module_id: number; title: string; estimated_minutes?: number; progress_status?: string | null };
type CourseDetails = { course: Course; modules: Module[]; lessons: Lesson[] };

function HBTCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [details, setDetails] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadCourses = () => {
    fetch(`${API_BASE_URL}/courses`, { headers })
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data.courses) ? data.courses : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  };

  const openCourse = (courseId: number) => {
    fetch(`${API_BASE_URL}/courses/${courseId}`, { headers })
      .then((res) => res.json())
      .then((data) => setDetails(data.status === "success" ? data : null))
      .catch(() => setDetails(null));
  };

  const completeLesson = async (lessonId: number) => {
    await fetch(`${API_BASE_URL}/courses/lessons/${lessonId}/complete`, { method: "POST", headers });
    if (details?.course?.id) openCourse(details.course.id);
    loadCourses();
  };

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => { if (!details && courses[0]) openCourse(courses[0].id); }, [courses.length]);

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container">
          <div className="mb-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">HBT Course Portal</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Training for Home Buying Teams.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Complete lessons, track progress, and continue from your current course.</p>
          </div>

          {loading ? <div className="loading-state">Loading courses...</div> : (
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <aside className="space-y-3">
                {courses.map((course) => (
                  <button key={course.id} onClick={() => openCourse(course.id)} className="w-full rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm hover:bg-blue-50">
                    <h2 className="text-lg font-black text-slate-950">{course.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-500">{course.description}</p>
                    <div className="mt-4 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${course.progress?.percent || 0}%` }} /></div>
                    <p className="mt-2 text-xs font-black text-blue-700">{course.progress?.percent || 0}% complete</p>
                  </button>
                ))}
              </aside>

              <section className="premium-card">
                {details ? (
                  <>
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                      <div><p className="eyebrow text-blue-600">Current course</p><h2 className="mt-2 text-3xl font-black">{details.course.title}</h2><p className="mt-2 text-slate-600">{details.course.description}</p></div>
                      <div className="rounded-3xl bg-blue-50 p-5 text-center"><p className="text-3xl font-black text-blue-700">{details.course.progress?.percent || 0}%</p><p className="text-xs font-black uppercase text-blue-700">Complete</p></div>
                    </div>
                    <div className="space-y-5">
                      {details.modules.map((module) => (
                        <div key={module.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                          <h3 className="text-xl font-black text-slate-950">{module.title}</h3>
                          <div className="mt-4 space-y-3">
                            {details.lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => (
                              <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
                                <div><p className="font-black text-slate-900">{lesson.title}</p><p className="mt-1 text-xs font-bold text-slate-500">{lesson.estimated_minutes || 5} min</p></div>
                                <button onClick={() => completeLesson(lesson.id)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">{lesson.progress_status ? "Completed" : "Mark Complete"}</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="empty-state">Select a course.</div>}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default HBTCourses;
