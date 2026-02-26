"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "tops" | "bottoms" | "outers";
type Mode = "work" | "casual";

// 色は最小限（迷わせない）
type ColorTag =
  | "black"
  | "white"
  | "navy"
  | "beige"
  | "gray"
  | "brown"
  | "color"
  | "pattern";

type Item = {
  id: string;
  image: string; // dataURL
  color: ColorTag;
};

type Clothes = Record<Category, Item[]>;

const STORAGE_KEY = "clothesData_v2";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scorePair(a: ColorTag, b: ColorTag, mode: Mode): number {
  // ざっくりルール：高いほど相性よい
  // workは「無彩色/ネイビー/ベージュ」寄りを高く
  // casualは「カラー」も許容して点を上げる
  const neutrals: ColorTag[] = ["black", "white", "navy", "beige", "gray", "brown"];
  const isNeutral = (c: ColorTag) => neutrals.includes(c);

  // 柄×柄は避ける
  if (a === "pattern" && b === "pattern") return -10;

  // カラー×柄はちょい難
  if ((a === "color" && b === "pattern") || (a === "pattern" && b === "color")) return mode === "casual" ? 1 : -2;

  // 同系色は安全
  if (a === b) return isNeutral(a) ? 6 : mode === "casual" ? 5 : 2;

  // neutral×neutral は鉄板
  if (isNeutral(a) && isNeutral(b)) return mode === "work" ? 8 : 7;

  // neutral×color/pattern
  if (isNeutral(a) && (b === "color" || b === "pattern")) return mode === "casual" ? 7 : 4;
  if (isNeutral(b) && (a === "color" || a === "pattern")) return mode === "casual" ? 7 : 4;

  // color×color は普段ならOK、仕事なら低め
  if (a === "color" && b === "color") return mode === "casual" ? 4 : 0;

  return 2;
}

function scoreOutfit(t: ColorTag, b: ColorTag, o: ColorTag, mode: Mode): number {
  // トップス×ボトムスを最重視、アウターは足し算で整える
  return scorePair(t, b, mode) * 3 + scorePair(o, t, mode) + scorePair(o, b, mode);
}

const COLOR_LABEL: Record<ColorTag, string> = {
  black: "黒",
  white: "白",
  navy: "ネイビー",
  beige: "ベージュ",
  gray: "グレー",
  brown: "ブラウン",
  color: "カラー",
  pattern: "柄",
};

const COLOR_DOT: Record<ColorTag, string> = {
  black: "bg-black",
  white: "bg-white border border-slate-200",
  navy: "bg-slate-800",
  beige: "bg-[#E7D7C5]",
  gray: "bg-slate-300",
  brown: "bg-[#7A5C46]",
  color: "bg-gradient-to-b from-pink-300 to-indigo-400",
  pattern: "bg-[repeating-linear-gradient(45deg,#111_0,#111_6px,#fff_6px,#fff_12px)]",
};

export default function Home() {
  const [category, setCategory] = useState<Category>("tops");
  const [mode, setMode] = useState<Mode>("casual");

  const [clothes, setClothes] = useState<Clothes>({
    tops: [],
    bottoms: [],
    outers: [],
  });

  const [coordination, setCoordination] = useState<{
    tops?: Item;
    bottoms?: Item;
    outers?: Item;
    reason?: string;
  }>({});

  // 追加時に選ぶ色
  const [selectedColor, setSelectedColor] = useState<ColorTag>("black");

  const canGenerate = useMemo(
    () => clothes.tops.length > 0 && clothes.bottoms.length > 0 && clothes.outers.length > 0,
    [clothes]
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setClothes(JSON.parse(saved));
  }, []);

  const saveToStorage = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (clothes[category].length >= 5) {
      alert("最大5個までです");
      return;
    }

    const dataUrl = await fileToDataUrl(file);

    const newItem: Item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      image: dataUrl,
      color: selectedColor,
    };

    const updated: Clothes = {
      ...clothes,
      [category]: [...clothes[category], newItem],
    };

    setClothes(updated);
    saveToStorage(updated);
    e.currentTarget.value = "";
  };

  const handleDelete = (index: number) => {
    const updated: Clothes = {
      ...clothes,
      [category]: clothes[category].filter((_, i) => i !== index),
    };
    setClothes(updated);
    saveToStorage(updated);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setClothes({ tops: [], bottoms: [], outers: [] });
    setCoordination({});
  };

  const generateCoordination = () => {
    if (!canGenerate) {
      alert("トップス・ボトムス・アウターを1つ以上登録してね");
      return;
    }

    // 全組み合わせから一番スコア高いものを選ぶ（無料AI風）
    let best: { t: Item; b: Item; o: Item; score: number } | null = null;

    for (const t of clothes.tops) {
      for (const b of clothes.bottoms) {
        for (const o of clothes.outers) {
          const s = scoreOutfit(t.color, b.color, o.color, mode);
          if (!best || s > best.score) best = { t, b, o, score: s };
        }
      }
    }

    // 同点が多いと毎回同じになりがちなので、少しランダム性を足す（上位候補から選ぶ）
    const scored: { t: Item; b: Item; o: Item; score: number }[] = [];
    for (const t of clothes.tops) {
      for (const b of clothes.bottoms) {
        for (const o of clothes.outers) {
          scored.push({ t, b, o, score: scoreOutfit(t.color, b.color, o.color, mode) });
        }
      }
    }
    scored.sort((a, b) => b.score - a.score);
    const topK = scored.slice(0, Math.min(5, scored.length));
    const picked = pickRandom(topK);

    const reason =
      mode === "work"
        ? `落ち着いた配色（${COLOR_LABEL[picked.t.color]}×${COLOR_LABEL[picked.b.color]}）に、${COLOR_LABEL[picked.o.color]}で全体を締めました。`
        : `合わせやすい組み合わせ（${COLOR_LABEL[picked.t.color]}×${COLOR_LABEL[picked.b.color]}）に、${COLOR_LABEL[picked.o.color]}でバランスを取りました。`;

    setCoordination({ tops: picked.t, bottoms: picked.b, outers: picked.o, reason });
  };

  const labelOf = (cat: Category) =>
    cat === "tops" ? "トップス" : cat === "bottoms" ? "ボトムス" : "アウター";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-wide">今日これ</h1>
        <p className="text-sm text-slate-500 mt-1">smart outfit assistant</p>
        <div className="h-[2px] w-16 bg-amber-500 mx-auto mt-3 rounded-full"></div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-slate-100 space-y-6">
        {/* Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("work")}
            className={`flex-1 py-2 rounded-xl font-medium transition ${
              mode === "work" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            仕事着
          </button>

          <button
            onClick={() => setMode("casual")}
            className={`flex-1 py-2 rounded-xl font-medium transition ${
              mode === "casual" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            普段着
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {(["tops", "bottoms", "outers"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`py-2 rounded-xl border transition ${
                category === cat
                  ? "border-amber-500 text-amber-700 bg-amber-50"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {labelOf(cat)}
            </button>
          ))}
        </div>

        {/* 色選択 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-800">色を選ぶ（追加時）</div>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(COLOR_LABEL) as ColorTag[]).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`rounded-xl border p-2 flex items-center gap-2 transition ${
                  selectedColor === c ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"
                }`}
              >
                <span className={`w-5 h-5 rounded-full ${COLOR_DOT[c]}`}></span>
                <span className="text-xs text-slate-700">{COLOR_LABEL[c]}</span>
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            今は「色だけ」でAIっぽくします（あとで自動判定も可能）。
          </div>
        </div>

        {/* Upload */}
        <label className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl cursor-pointer">
          ＋ {labelOf(category)}を追加
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>

        {/* Images */}
        <div className="grid grid-cols-2 gap-3">
          {clothes[category].map((item, index) => (
            <div key={item.id} className="relative">
              <img src={item.image} className="w-full h-40 object-cover rounded-xl" />
              <div className="absolute left-2 bottom-2 text-[11px] px-2 py-1 rounded-full bg-white/90 border border-slate-200 text-slate-700">
                {COLOR_LABEL[item.color]}
              </div>
              <button
                onClick={() => handleDelete(index)}
                className="absolute top-2 right-2 bg-black/70 text-white text-xs rounded-full w-6 h-6"
                aria-label="delete"
              >
                ×
              </button>
            </div>
          ))}

          {clothes[category].length === 0 && (
            <div className="col-span-2 text-center text-sm text-slate-500 py-8 border border-dashed rounded-xl">
              まだ {labelOf(category)} がありません
            </div>
          )}
        </div>

        {/* Buttons */}
        <button
          onClick={generateCoordination}
          className="
            w-full
            py-3
            rounded-xl
            font-semibold
            text-slate-900
            tracking-wide
            bg-[linear-gradient(to_bottom,#FDE68A,#FBBF24,#B45309)]
            shadow-[0_6px_18px_rgba(180,83,9,0.22)]
            active:scale-[0.98]
            transition-all
            duration-200
          "
        >
          コーデ生成（AI）
        </button>

        <button
          onClick={handleReset}
          className="w-full border border-slate-300 text-slate-600 py-3 rounded-xl hover:bg-slate-100 transition"
        >
          リセット
        </button>

        {/* Result */}
        {coordination.tops && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">
                {mode === "work" ? "仕事コーデ" : "普段コーデ"}
              </div>
              <div className="text-xs text-slate-600 mt-1">{coordination.reason}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                <div className="px-3 py-2 text-xs text-slate-600">トップス（{COLOR_LABEL[coordination.tops.color]}）</div>
                <img src={coordination.tops.image} className="w-full h-44 object-cover" />
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                <div className="px-3 py-2 text-xs text-slate-600">アウター（{COLOR_LABEL[coordination.outers!.color]}）</div>
                <img src={coordination.outers!.image} className="w-full h-44 object-cover" />
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div className="px-3 py-2 text-xs text-slate-600">ボトムス（{COLOR_LABEL[coordination.bottoms!.color]}）</div>
              <img src={coordination.bottoms!.image} className="w-full h-56 object-cover" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}