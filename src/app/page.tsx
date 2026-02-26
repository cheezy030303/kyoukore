"use client";

import { useEffect, useMemo, useState } from "react";

type Clothes = {
  tops: string[];
  bottoms: string[];
  outers: string[];
};

const STORAGE_KEY = "clothesData";

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

export default function Home() {
  const [category, setCategory] = useState<keyof Clothes>("tops");
  const [mode, setMode] = useState<"work" | "casual">("casual");

  const [clothes, setClothes] = useState<Clothes>({
    tops: [],
    bottoms: [],
    outers: [],
  });

  const [coordination, setCoordination] = useState<{
    tops?: string;
    bottoms?: string;
    outers?: string;
  }>({});

  const canGenerate = useMemo(
    () =>
      clothes.tops.length > 0 &&
      clothes.bottoms.length > 0 &&
      clothes.outers.length > 0,
    [clothes]
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setClothes(JSON.parse(saved));
  }, []);

  const saveToStorage = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (clothes[category].length >= 5) {
      alert("最大5個までです");
      return;
    }

    const dataUrl = await fileToDataUrl(file);

    const updated = {
      ...clothes,
      [category]: [...clothes[category], dataUrl],
    };

    setClothes(updated);
    saveToStorage(updated);
    e.currentTarget.value = "";
  };

  const generateCoordination = () => {
    if (!canGenerate) {
      alert("3カテゴリ登録してね");
      return;
    }

    setCoordination({
      tops: pickRandom(clothes.tops),
      bottoms: pickRandom(clothes.bottoms),
      outers: pickRandom(clothes.outers),
    });
  };

  const handleDelete = (index: number) => {
    const updated = {
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex flex-col items-center px-4 py-10">

      {/* Header */}
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-wide">
          今日これ
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          smart outfit assistant
        </p>
        <div className="h-[2px] w-16 bg-amber-500 mx-auto mt-3 rounded-full"></div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-slate-100 space-y-6">

        {/* Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("work")}
            className={`flex-1 py-2 rounded-xl font-medium transition ${
              mode === "work"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            仕事着
          </button>

          <button
            onClick={() => setMode("casual")}
            className={`flex-1 py-2 rounded-xl font-medium transition ${
              mode === "casual"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
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
                  ? "border-amber-500 text-amber-600 bg-amber-50"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {cat === "tops"
                ? "トップス"
                : cat === "bottoms"
                ? "ボトムス"
                : "アウター"}
            </button>
          ))}
        </div>

        {/* Upload */}
        <label className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl cursor-pointer">
          ＋ 追加する
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>

        {/* Images */}
        <div className="grid grid-cols-2 gap-3">
          {clothes[category].map((item, index) => (
            <div key={index} className="relative">
              <img
                src={item}
                className="w-full h-40 object-cover rounded-xl"
              />
              <button
                onClick={() => handleDelete(index)}
                className="absolute top-2 right-2 bg-black/70 text-white text-xs rounded-full w-6 h-6"
              >
                ×
              </button>
            </div>
          ))}
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
    shadow-[0_4px_12px_rgba(180,83,9,0.25)]
    active:scale-[0.98]
    transition-all
    duration-200
  "
>
  コーデ生成
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
            <img
              src={coordination.tops}
              className="w-full rounded-xl object-cover"
            />
            <img
              src={coordination.bottoms}
              className="w-full rounded-xl object-cover"
            />
            <img
              src={coordination.outers}
              className="w-full rounded-xl object-cover"
            />
          </div>
        )}
      </div>
    </main>
  );
}