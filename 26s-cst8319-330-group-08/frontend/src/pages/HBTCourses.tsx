import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api/api";

type CourseProgress = {
  percent: number;
  completed_lessons: number;
  total_lessons: number;
  resume_lesson_id?: number | null;
  resume_lesson_title?: string | null;
  resume_module_title?: string | null;
  is_complete?: boolean;
};

type Course = {
  id: number;
  title: string;
  description?: string | null;
  progress?: CourseProgress;
};

type Module = {
  id: number;
  course_id: number;
  title: string;
  description?: string | null;
};

type Lesson = {
  id: number;
  module_id: number;
  title: string;
  lesson_type?: string | null;
  content?: string | null;
  video_url?: string | null;
  resource_url?: string | null;
  estimated_minutes?: number;
  progress_status?: string | null;
  completed_at?: string | null;
};

type CourseDetails = {
  course: Course;
  modules: Module[];
  lessons: Lesson[];
};

const getHostName = (url?: string | null) => {
  if (!url) return "External resource";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "External resource";
  }
};

const getVideoEmbedUrl = (url?: string | null) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
  } catch {
    return null;
  }
};

function HBTCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [details, setDetails] = useState<CourseDetails | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);
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
      .then((data) => {
        if (data.status !== "success") {
          setDetails(null);
          setSelectedLessonId(null);
          return;
        }

        setDetails(data);
        const resumeId = data.course?.progress?.resume_lesson_id;
        const firstLessonId = Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons[0].id : null;
        setSelectedLessonId(resumeId || firstLessonId || null);
      })
      .catch(() => {
        setDetails(null);
        setSelectedLessonId(null);
      });
  };

  const completeLesson = async (lessonId: number) => {
    try {
      setSavingLessonId(lessonId);
      await fetch(`${API_BASE_URL}/courses/lessons/${lessonId}/complete`, { method: "POST", headers });
      if (details?.course?.id) openCourse(details.course.id);
      loadCourses();
    } finally {
      setSavingLessonId(null);
    }
  };

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => { if (!details && courses[0]) openCourse(courses[0].id); }, [courses.length]);

  const resumeLessonId = details?.course.progress?.resume_lesson_id || null;
  const selectedLesson = useMemo(() => details?.lessons.find((lesson) => lesson.id === selectedLessonId) || null, [details, selectedLessonId]);
  const selectedModule = useMemo(() => details?.modules.find((module) => module.id === selectedLesson?.module_id) || null, [details, selectedLesson]);
  const videoEmbedUrl = getVideoEmbedUrl(selectedLesson?.video_url);

  return (
    <main className="theme-page min-h-screen text-slate-950">
      <Navbar />
      <section className="px-4 py-8 md:px-6 lg:py-12">
        <div className="section-container">
          <div className="mb-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">HBT Course Portal</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Training for Home Buying Teams.</h1>
            <p className="mt-4 max-w-3xl text-slate-300">Open lessons, view resources, track progress, and resume from the next unfinished lesson.</p>
          </div>

          {loading ? <div className="loading-state">Loading courses...</div> : (
            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
                {courses.map((course) => (
                  <button key={course.id} onClick={() => openCourse(course.id)} className={`w-full rounded-3xl border p-5 text-left shadow-sm transition hover:bg-blue-50 ${details?.course?.id === course.id ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white"}`}>
                    <h2 className="text-lg font-black text-slate-950">{course.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-500">{course.description}</p>
                    <div className="mt-4 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${course.progress?.percent || 0}%` }} /></div>
                    <p className="mt-2 text-xs font-black text-blue-700">{course.progress?.percent || 0}% complete</p>
                    <p className="mt-2 line-clamp-1 text-xs font-bold text-slate-500">
                      {course.progress?.is_complete ? "Course finished" : course.progress?.resume_lesson_title ? `Resume: ${course.progress.resume_lesson_title}` : "Start first lesson"}
                    </p>
                  </button>
                ))}
              </aside>

              <section className="space-y-6">
                {details ? (
                  <>
                    <div className="premium-card">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="eyebrow text-blue-600">Current course</p>
                          <h2 className="mt-2 text-3xl font-black">{details.course.title}</h2>
                          <p className="mt-2 text-slate-600">{details.course.description}</p>
                          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
                            {details.course.progress?.is_complete
                              ? "You completed this course. Great work."
                              : details.course.progress?.resume_lesson_title
                                ? `Resume next: ${details.course.progress.resume_module_title} → ${details.course.progress.resume_lesson_title}`
                                : "Start this course from the first lesson."}
                          </div>
                        </div>
                        <div className="rounded-3xl bg-blue-50 p-5 text-center"><p className="text-3xl font-black text-blue-700">{details.course.progress?.percent || 0}%</p><p className="text-xs font-black uppercase text-blue-700">Complete</p></div>
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
                      <div className="premium-card space-y-5">
                        <div>
                          <p className="eyebrow text-slate-500">Lessons</p>
                          <h3 className="mt-1 text-2xl font-black text-slate-950">Course outline</h3>
                        </div>

                        {details.modules.map((module) => (
                          <div key={module.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                            <h3 className="text-xl font-black text-slate-950">{module.title}</h3>
                            {module.description && <p className="mt-1 text-sm font-semibold text-slate-500">{module.description}</p>}
                            <div className="mt-4 space-y-3">
                              {details.lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => {
                                const isResume = resumeLessonId === lesson.id;
                                const isDone = Boolean(lesson.progress_status);
                                const isSelected = selectedLessonId === lesson.id;

                                return (
                                  <div key={lesson.id} className={`rounded-2xl p-4 transition ${isSelected ? "bg-blue-50 ring-2 ring-blue-200" : isResume ? "bg-blue-50/70 ring-1 ring-blue-100" : "bg-white"}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <button onClick={() => setSelectedLessonId(lesson.id)} className="min-w-0 flex-1 text-left">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-black text-slate-900">{lesson.title}</p>
                                          {isResume && <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black uppercase text-white">Resume here</span>}
                                          {isSelected && <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black uppercase text-white">Open</span>}
                                        </div>
                                        <p className="mt-1 text-xs font-bold text-slate-500">{lesson.estimated_minutes || 5} min · {lesson.lesson_type || "lesson"}</p>
                                      </button>
                                      <div className="flex flex-wrap gap-2">
                                        <button onClick={() => setSelectedLessonId(lesson.id)} className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm hover:bg-blue-100">Open Lesson</button>
                                        <button disabled={savingLessonId === lesson.id} onClick={() => completeLesson(lesson.id)} className={`rounded-full px-4 py-2 text-sm font-black text-white disabled:opacity-60 ${isDone ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-950 hover:bg-blue-700"}`}>{savingLessonId === lesson.id ? "Saving..." : isDone ? "Completed" : "Mark Complete"}</button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <aside className="premium-card xl:sticky xl:top-24 xl:self-start">
                        {selectedLesson ? (
                          <div>
                            <p className="eyebrow text-blue-600">Lesson viewer</p>
                            <h3 className="mt-2 text-3xl font-black text-slate-950">{selectedLesson.title}</h3>
                            <p className="mt-2 text-sm font-bold text-slate-500">{selectedModule?.title || "Course module"} · {selectedLesson.estimated_minutes || 5} min</p>

                            {videoEmbedUrl && (
                              <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-lg">
                                <iframe title={selectedLesson.title} src={videoEmbedUrl} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                              </div>
                            )}

                            {selectedLesson.video_url && !videoEmbedUrl && (
                              <a href={selectedLesson.video_url} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-between gap-4 rounded-[1.5rem] bg-slate-950 p-4 text-white hover:bg-blue-700">
                                <span><b>Open training video</b><span className="block text-xs text-white/70">{getHostName(selectedLesson.video_url)}</span></span>
                                <span className="text-xl">↗</span>
                              </a>
                            )}

                            <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                              {selectedLesson.content ? (
                                selectedLesson.content.split("\n").map((line, index) => line.trim() ? <p key={index} className="mb-3 last:mb-0">{line}</p> : <br key={index} />)
                              ) : (
                                <div>
                                  <p className="font-black text-slate-900">No written lesson content yet.</p>
                                  <p className="mt-2">Add lesson content, a video URL, or a resource URL in the course data. The viewer is ready; it just needs real material.</p>
                                </div>
                              )}
                            </div>

                            {selectedLesson.resource_url && (
                              <a href={selectedLesson.resource_url} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between gap-4 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 text-blue-900 hover:bg-blue-100">
                                <span><b>Open lesson resource</b><span className="block text-xs font-bold text-blue-700">{getHostName(selectedLesson.resource_url)}</span></span>
                                <span className="text-xl">↗</span>
                              </a>
                            )}

                            <button disabled={savingLessonId === selectedLesson.id} onClick={() => completeLesson(selectedLesson.id)} className={`mt-6 w-full rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-60 ${selectedLesson.progress_status ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-950 hover:bg-blue-700"}`}>
                              {savingLessonId === selectedLesson.id ? "Saving..." : selectedLesson.progress_status ? "Lesson Completed" : "Mark This Lesson Complete"}
                            </button>
                          </div>
                        ) : (
                          <div className="empty-state">Select a lesson to open the content.</div>
                        )}
                      </aside>
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
