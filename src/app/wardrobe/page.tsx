"use client";

import React, { useEffect, useMemo, useState } from "react";
import BottomTab from "@/components/BottomTab";

type Category = "tops" | "bottoms" | "outers" | "shoes" | "bags" | "accessories";

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

const STORAGE_KEY = "clothesData_v4";
const MAX_PER_CATEGORY = 5;

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
  pattern:
    "bg-[repeating-linear-gradient(45deg,#111_0,#111_6px,#fff_6px,#fff_12px)]",
};

function labelOf(cat: Category) {
  if (cat === "tops") return "トップス";
  if (cat === "bottoms") return "ボトムス";
  if (cat === "outers") return "アウター";
  if (cat === "shoes") return "靴";
  if (cat === "bags") return "バッグ";
  return "アクセ";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WardrobePage() {
  const [category, setCategory] = useState<Category>("tops");
  const [selectedColor, setSelectedColor] = useState<ColorTag>("black");

  const [clothes, setClothes] = useState<Clothes>({
    tops: [],
    bottoms: [],
    outers: [],
    shoes: [],
    bags: [],
    accessories: [],
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged: Clothes = {
          tops: parsed.tops ?? [],
          bottoms: parsed.bottoms ?? [],
          outers: parsed.outers ?? [],
          shoes: parsed.shoes ?? [],
          bags: parsed.bags ?? [],
          accessories: parsed.accessories ?? [],
        };
        setClothes(merged);
      } catch {
        // ignore
      }
    }
  }, []);

  const saveToStorage = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const counts = useMemo(() => {
    const c: Record<Category, number> = {
      tops: clothes.tops.length,
      bottoms: clothes.bottoms.length,
      outers: clothes.outers.length,
      shoes: clothes.shoes.length,
      bags: clothes.bags.length,
      accessories: clothes.accessories.length,
    };
    return c;
  }, [clothes]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (clothes[category].length >= MAX_PER_CATEGORY) {
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

  const handleDelete = (cat: Category, index: number) => {
    const updated: Clothes = {
      ...clothes,
      [cat]: clothes[cat].filter((_, i) => i !== index),
    };
    setClothes(updated);
    saveToStorage(updated);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex flex-col items-center px-4 pt-10 pb-28">
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-wide">
          ワードローブ
        </h1>
        <p className="text-sm text-slate-500 mt-1">登録・削除はこちら</p>
        <div className="h-[2px] w-16 bg-rose-200 mx-auto mt-3 rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-slate-100 space-y-6">
        {/* Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">
            登録数
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-700">
            {(Object.keys(counts) as Category[]).map((k) => (
              <div key={k} className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                <div className="font-semibold">{labelOf(k)}</div>
                <div className="text-slate-500">{counts[k]} / {MAX_PER_CATEGORY}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            ※ ホームは軽くするため、ここでまとめて管理します。
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {(["tops", "bottoms", "outers", "shoes", "bags", "accessories"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`py-2 rounded-xl border transition ${
                category === cat
                  ? "border-rose-200 text-rose-500 bg-rose-50"
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
                  selectedColor === c ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
                }`}
              >
                <span className={`w-5 h-5 rounded-full ${COLOR_DOT[c]}`}></span>
                <span className="text-xs text-slate-700">{COLOR_LABEL[c]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <label className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl cursor-pointer">
          ＋ {labelOf(category)}を追加（最大{MAX_PER_CATEGORY}）
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>

        {/* Items */}
        <div className="grid grid-cols-3 gap-3">
          {clothes[category].map((item, index) => (
            <div key={item.id} className="relative">
              <img
                src={item.image}
                className="w-full aspect-square object-cover rounded-xl border border-slate-200"
                loading="lazy"
              />
              <div className="absolute left-1 bottom-1 text-[10px] px-2 py-1 rounded-full bg-white/90 border border-slate-200 text-slate-700">
                {COLOR_LABEL[item.color]}
              </div>
              <button
                onClick={() => handleDelete(category, index)}
                className="absolute top-1 right-1 bg-black/70 text-white text-xs rounded-full w-6 h-6"
                aria-label="delete"
              >
                ×
              </button>
            </div>
          ))}

          {clothes[category].length === 0 && (
            <div className="col-span-3 text-center text-sm text-slate-500 py-8 border border-dashed rounded-xl">
              まだ {labelOf(category)} がありません
            </div>
          )}
        </div>
      </div>

      <BottomTab />
    </main>
  );
}