import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Props = { session: Session | null };

export function Account({ session }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!supabase) {
    return <p className="account-note">Supabase未設定のため、デッキはこのブラウザに保存されます。</p>;
  }

  if (session) {
    return (
      <div className="account">
        <span className="account-email">{session.user.email}</span>
        <button type="button" className="btn btn-quiet" onClick={() => supabase!.auth.signOut()}>
          ログアウト
        </button>
      </div>
    );
  }

  const run = async (mode: "in" | "up") => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "in") {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase!.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMessage("確認メールを送りました。メール内のリンクを開いてからログインしてください。");
      }
    } catch (e) {
      setMessage(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="account">
        <span className="account-note">ログインするとデッキをクラウドに保存できます。</span>
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          ログイン
        </button>
      </div>
    );
  }

  return (
    <form
      className="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        void run("in");
      }}
    >
      <label>
        メールアドレス
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        パスワード(6文字以上)
        <input
          type="password"
          autoComplete="current-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <div className="account-buttons">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          ログイン
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || !email || password.length < 6}
          onClick={() => void run("up")}
        >
          新規登録
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
          閉じる
        </button>
      </div>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function authMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(msg)) return "メールアドレスかパスワードが違います。";
  if (/email not confirmed/i.test(msg)) return "メールアドレスの確認がまだです。確認メールのリンクを開いてください。";
  if (/already registered/i.test(msg)) return "このメールアドレスは登録済みです。ログインしてください。";
  return `ログインできませんでした:${msg}`;
}
