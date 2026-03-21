import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      if (res.ok) {
        // Invalidate auth cache so useAuth() picks up the new session
        await utils.auth.me.invalidate();
        navigate("/");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid password");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--void-black, #050508)" }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl border p-8"
        style={{
          background: "var(--near-black, #0a0a0f)",
          borderColor: "var(--border-default, rgba(255,255,255,0.08))",
          boxShadow: "0 0 40px rgba(0, 240, 255, 0.05)",
        }}
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-widest uppercase mb-1"
            style={{ color: "var(--neon-cyan, #00f0ff)", textShadow: "0 0 20px rgba(0,240,255,0.4)" }}
          >
            NEON SIGNS
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted, #6b7280)" }}>
            The Mirror That Glows
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: "var(--text-muted, #6b7280)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-default, rgba(255,255,255,0.08))",
                color: "var(--neon-cyan, #00f0ff)",
                caretColor: "var(--neon-cyan, #00f0ff)",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "var(--neon-cyan, #00f0ff)";
                e.currentTarget.style.boxShadow = "0 0 0 1px var(--neon-cyan, #00f0ff)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.08))";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg py-3 text-sm font-semibold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading
                ? "rgba(0,240,255,0.1)"
                : "rgba(0,240,255,0.12)",
              border: "1px solid var(--neon-cyan, #00f0ff)",
              color: "var(--neon-cyan, #00f0ff)",
              boxShadow: loading ? "none" : "0 0 16px rgba(0,240,255,0.15)",
            }}
          >
            {loading ? "Signing in…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
