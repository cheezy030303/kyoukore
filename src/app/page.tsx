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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-full text-sm font-medium transition",
        active
          ? "bg-black text-white shadow"
          : "bg-white/70 text-gray-800 border border-black/5 hover:bg-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SectionTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 min-w-0 rounded-2xl px-3 py-3 text-left transition",
        active
          ? "bg-white shadow-sm border border-black/5"
          : "bg-white/60 hover:bg-white/80",
      ].join(" ")}
    >
      <div className="text-xs text-gray-500">カテゴリー</div>
      <div className="mt-1 flex items-center justify-between">
        <div className="font-semibold whitespace-nowrap text-sm">
          {label}
        </div>
        <div className="text-xs text-gray-500">{count}/5</div>
      </div>
    </button>
  );
}

export default function Home() {
  const [category, setCategory] = useState<keyof Clothes>("tops");
  const [mode, setMode] = useState<"work" | "casual">("casual");

  const [clothes, setClothes] = useState<Clothes>({
    tops: [],
    bottoms: [],
    outers: [],
  });

  const [coordination, setCoordination] = useState<any>({});

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (clothes[category].length >= 5) {
      alert("最大5個までです！");
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
      alert("全部のカテゴリを1つ以上登録してね！");
      return;
    }

    setCoordination({
      tops: pickRandom(clothes.tops),
      bottoms: pickRandom(clothes.bottoms),
      outers: pickRandom(clothes.outers),
    });
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setClothes({ tops: [], bottoms: [], outers: [] });
    setCoordination({});
  };

  const handleDelete = (index: number) => {
    const updated = {
      ...clothes,
      [category]: clothes[category].filter((_, i) => i !== index),
    };
    setClothes(updated);
    saveToStorage(updated);
  };

  return (
    <main className="min-h-screen flex justify-center bg-gradient-to-b from-[#F7F2FF] via-[#F3FAFF] to-white">
      <div className="w-[390px] min-h-screen px-4 py-6">
        <h1 className="text-2xl font-bold text-center mb-4">今日これ</h1>

        <div className="rounded-3xl bg-white/80 shadow p-4">
          <div className="flex gap-2 justify-center mb-4">
            <Pill active={mode === "work"} onClick={() => setMode("work")}>
              仕事着
            </Pill>
            <Pill active={mode === "casual"} onClick={() => setMode("casual")}>
              普段着
            </Pill>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SectionTab
              active={category === "tops"}
              onClick={() => setCategory("tops")}
              label="トップス"
              count={clothes.tops.length}
            />
            <SectionTab
              active={category === "bottoms"}
              onClick={() => setCategory("bottoms")}
              label="ボトムス"
              count={clothes.bottoms.length}
            />
            <SectionTab
              active={category === "outers"}
              onClick={() => setCategory("outers")}
              label="アウター"
              count={clothes.outers.length}
            />
          </div>

          <label className="block mt-4 bg-black text-white text-center py-3 rounded-2xl cursor-pointer">
            ＋ 追加する
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {clothes[category].map((item, index) => (
              <div
                key={index}
                className="relative rounded-2xl overflow-hidden shadow"
              >
                <button
                  onClick={() => handleDelete(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
                <img src={item} className="w-full h-44 object-cover" />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={generateCoordination}
              className="bg-blue-500 text-white py-3 rounded-2xl"
            >
              コーデ生成
            </button>
            <button
              onClick={handleReset}
              className="bg-red-500 text-white py-3 rounded-2xl"
            >
              リセット
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}