import { useSyncExternalStore } from "react";
import { getBattleSettings, setBattleSettings, subscribeBattleSettings, type PayMode } from "../lib/battleSettings";

const PAY_MODES: { value: PayMode; label: string; hint: string }[] = [
  { value: "auto", label: "完全オート", hint: "マナはいつもおまかせで払う" },
  { value: "ask", label: "逐一オートかセルフ", hint: "払うたびに、おまかせの払い方を選んだ状態で確認する" },
  { value: "self", label: "完全セルフ", hint: "払うたびに、使うマナを自分で選ぶ" },
];

/** 対戦の操作設定:マナの支払いと、相手ターンのインスタント確認 */
export function BattleSettingsPanel() {
  const s = useSyncExternalStore(subscribeBattleSettings, getBattleSettings);
  return (
    <div className="battle-settings" role="group" aria-label="対戦の操作設定">
      <label className="bs-field" title={PAY_MODES.find((m) => m.value === s.payMode)?.hint}>
        <span>マナの支払い</span>
        <select value={s.payMode} onChange={(e) => setBattleSettings({ payMode: e.target.value as PayMode })}>
          {PAY_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="bs-field bs-check" title="オフにすると、相手のターンはインスタントを使うか聞かずに進む(ブロックや罠の確認は出る)">
        <input type="checkbox" checked={s.oppInstants} onChange={(e) => setBattleSettings({ oppInstants: e.target.checked })} />
        <span>相手ターンのインスタント確認</span>
      </label>
    </div>
  );
}
