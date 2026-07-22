import { Component, type ErrorInfo, type ReactNode } from "react";

 type Props = { children: ReactNode };
 type State = { hasError: boolean };

class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("HomeBoost UI crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">HomeBoost</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">This page could not be displayed.</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            A temporary interface error occurred. Your account data has not been changed.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.location.assign("/")}>
              Go home
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
