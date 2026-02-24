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
    () => clothes.tops.length > 0 && clothes.bottoms.length > 0 && clothes.outers.length > 0,
    [clothes]
  );

  // 初期読み込み
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setClothes(JSON.parse(saved));
  }, []);

  const saveToStorage = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // 画像追加（base64で保存→壊れない）
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

  // ✅ ランダムコーデ生成（課金なし）
  const generateCoordination = () => {
    if (!canGenerate) {
      alert("全部のカテゴリに1つ以上登録してください！");
      return;
    }

    // ※今はモードで表示名だけ変える（ロジック差は次に追加できる）
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

  return (
    <main className="min-h-screen flex justify-center bg-gray-100">
      <div className="w-[375px] min-h-screen bg-white shadow-xl p-6">
        <h1 className="text-xl font-bold mb-4 text-center">今日これ 👕</h1>

        {/* モード */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => setMode("work")}
            className={`px-3 py-1 rounded ${
              mode === "work" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            仕事着
          </button>
          <button
            onClick={() => setMode("casual")}
            className={`px-3 py-1 rounded ${
              mode === "casual" ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            普段着
          </button>
        </div>

        {/* カテゴリ */}
        <div className="flex justify-between mb-4">
          <button onClick={() => setCategory("tops")} className="text-sm">
            トップス
          </button>
          <button onClick={() => setCategory("bottoms")} className="text-sm">
            ボトムス
          </button>
          <button onClick={() => setCategory("outers")} className="text-sm">
            アウター
          </button>
        </div>

        {/* 追加 */}
        <label className="block bg-black text-white text-center py-2 rounded mb-4 cursor-pointer">
          追加する
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>

        {/* 一覧 */}
        <div className="grid grid-cols-2 gap-2">
          {clothes[category].map((item, index) => (
            <img key={index} src={item} className="w-full rounded shadow" />
          ))}
        </div>

        {/* 生成 */}
        <button
          onClick={generateCoordination}
          className="mt-6 w-full bg-blue-500 text-white py-2 rounded"
        >
          コーデ生成（無料）
        </button>

        {/* 結果 */}
        {coordination.tops && (
  <div className="mt-6">
    <h2 className="text-center font-bold mb-2">
      {mode === "work" ? "仕事コーデ 👔" : "普段コーデ 👕"}
    </h2>

    <img src={coordination.tops} className="w-full rounded mb-2" />
    <img src={coordination.bottoms} className="w-full rounded mb-2" />
    <img src={coordination.outers} className="w-full rounded" />
  </div>
)}

        {/* リセット */}
        <button onClick={handleReset} className="mt-6 w-full bg-red-500 text-white py-2 rounded">
          リセット
        </button>
      </div>
    </main>
  );
}