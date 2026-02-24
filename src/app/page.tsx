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
        "flex-1 rounded-2xl px-3 py-3 text-left transition",
        active
          ? "bg-white shadow-sm border border-black/5"
          : "bg-white/60 border border-black/0 hover:bg-white/80",
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

  const [coordination, setCoordination] = useState<{
    tops?: string;
    bottoms?: string;
    outers?: string;
  }>({});

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
      alert("トップス・ボトムス・アウターを1つ以上登録してね！");
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

  const title = "今日これ";
  const subtitle = "迷わない朝をつくる";

  return (
    <main className="min-h-screen flex justify-center bg-gradient-to-b from-[#F7F2FF] via-[#F3FAFF] to-white">
      <div className="w-[390px] min-h-screen px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
            <div className="rounded-2xl bg-white/70 border border-black/5 px-3 py-2 text-xs text-gray-600 shadow-sm">
              ver: free
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/70 backdrop-blur border border-black/5 shadow-sm p-4">
          {/* Mode */}
          <div className="flex gap-2 justify-center">
            <Pill active={mode === "work"} onClick={() => setMode("work")}>
              仕事着
            </Pill>
            <Pill active={mode === "casual"} onClick={() => setMode("casual")}>
              普段着
            </Pill>
          </div>

          {/* Category tabs */}
          <div className="mt-4 grid grid-cols-3 gap-2">
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

          {/* Upload */}
          <div className="mt-4">
            <label className="block rounded-2xl bg-black text-white text-center py-3 font-semibold shadow cursor-pointer active:scale-[0.99] transition">
              ＋ 追加する
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              {category === "tops" && "トップスを最大5枚まで登録できます"}
              {category === "bottoms" && "ボトムスを最大5枚まで登録できます"}
              {category === "outers" && "アウターを最大5枚まで登録できます"}
            </p>
          </div>

          {/* Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {clothes[category].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden"
              >
                <img src={item} className="w-full h-44 object-cover" />
              </div>
            ))}
            {clothes[category].length === 0 && (
              <div className="col-span-2 rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-center">
                <div className="text-sm font-semibold">まだ何もないよ</div>
                <div className="text-xs text-gray-500 mt-1">上の「＋追加する」から登録してね</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={generateCoordination}
              className="rounded-2xl bg-[#3B82F6] text-white py-3 font-semibold shadow active:scale-[0.99] transition"
            >
              コーデ生成
            </button>
            <button
              onClick={handleReset}
              className="rounded-2xl bg-[#EF4444] text-white py-3 font-semibold shadow active:scale-[0.99] transition"
            >
              リセット
            </button>
          </div>
        </div>

        {/* Result */}
        {coordination.tops && (
          <div className="mt-4 rounded-3xl bg-white/70 backdrop-blur border border-black/5 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                {mode === "work" ? "仕事コーデ 👔" : "普段コーデ 👕"}
              </h2>
              <span className="text-xs text-gray-500">提案 1セット</span>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
                <div className="px-3 py-2 text-xs text-gray-500">トップス</div>
                <img src={coordination.tops} className="w-full h-48 object-cover" />
              </div>
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
                <div className="px-3 py-2 text-xs text-gray-500">ボトムス</div>
                <img src={coordination.bottoms} className="w-full h-48 object-cover" />
              </div>
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
                <div className="px-3 py-2 text-xs text-gray-500">アウター</div>
                <img src={coordination.outers} className="w-full h-48 object-cover" />
              </div>
            </div>

            <button
              onClick={generateCoordination}
              className="mt-4 w-full rounded-2xl bg-black text-white py-3 font-semibold shadow active:scale-[0.99] transition"
            >
              もう一回つくる
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} kyoukore
        </div>
      </div>
    </main>
  );
}