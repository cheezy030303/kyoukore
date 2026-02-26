"use client";

import React, { useEffect, useMemo, useState } from "react";

type Category = "tops" | "bottoms" | "outers" | "shoes" | "bags" | "accessories";
type Mode = "work" | "casual";

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

type WeatherInfo = {
  city: string;
  temp: number | null;
  feels: number | null;
  code: number | null;
  tmax: number | null;
  tmin: number | null;
  precip: number | null;
  time: string | null;
};

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

/** 無料AI風：色相性 */
function scorePair(a: ColorTag, b: ColorTag, mode: Mode): number {
  const neutrals: ColorTag[] = ["black", "white", "navy", "beige", "gray", "brown"];
  const isNeutral = (c: ColorTag) => neutrals.includes(c);

  if (a === "pattern" && b === "pattern") return -10;

  if ((a === "color" && b === "pattern") || (a === "pattern" && b === "color")) {
    return mode === "casual" ? 2 : -2;
  }

  if (a === b) return isNeutral(a) ? 7 : mode === "casual" ? 5 : 2;

  if (isNeutral(a) && isNeutral(b)) return mode === "work" ? 9 : 8;

  if (isNeutral(a) && (b === "color" || b === "pattern")) return mode === "casual" ? 8 : 5;
  if (isNeutral(b) && (a === "color" || a === "pattern")) return mode === "casual" ? 8 : 5;

  if (a === "color" && b === "color") return mode === "casual" ? 4 : 0;

  return 2;
}

function tempBonusForOuter(outer: ColorTag, temp: number | null): number {
  if (temp == null) return 0;

  const light: ColorTag[] = ["white", "beige", "gray"];
  const dark: ColorTag[] = ["black", "navy", "brown"];

  // 暖かい日は軽い色を優先
  if (temp >= 20) {
    if (light.includes(outer)) return 2;
    if (dark.includes(outer)) return -1;
  }

  // 寒い日は濃い色を優先
  if (temp <= 12) {
    if (dark.includes(outer)) return 2;
    if (light.includes(outer)) return -1;
  }

  return 0;
}

function rainPenaltyForLightItem(color: ColorTag, precip: number | null): number {
  if (precip == null) return 0;
  if (precip < 40) return 0;

  // 雨の日：淡色（白/ベージュ/グレー）をちょい避ける（汚れ・水はね想定）
  if (color === "white" || color === "beige" || color === "gray") return -1;

  // 黒/ネイビーは安心
  if (color === "black" || color === "navy") return 1;

  return 0;
}

function rainPenaltyForBottom(bottom: ColorTag, precip: number | null): number {
  if (precip == null) return 0;
  if (precip < 40) return 0;

  if (bottom === "white" || bottom === "beige") return -2;
  if (bottom === "black" || bottom === "navy") return 1;

  return 0;
}

function scoreOutfit6(
  t: ColorTag,
  b: ColorTag,
  o: ColorTag,
  s: ColorTag,
  bag: ColorTag,
  acc: ColorTag,
  mode: Mode,
  temp: number | null,
  precip: number | null
): number {
  // 軸：トップス×ボトムスを重めに
  const base =
    scorePair(t, b, mode) * 3 +
    scorePair(o, t, mode) +
    scorePair(o, b, mode) +
    scorePair(s, b, mode) +
    scorePair(s, bag, mode) +
    scorePair(bag, t, mode) +
    scorePair(acc, t, mode);

  const weather =
    tempBonusForOuter(o, temp) +
    rainPenaltyForBottom(b, precip) +
    // 雨の日は靴・バッグ淡色を少し避ける（現実寄り）
    rainPenaltyForLightItem(s, precip) * 2 +
    rainPenaltyForLightItem(bag, precip) * 2;

  // ========= 垢抜けルール =========

  // 仕事：靴とバッグを揃えると「きちんと感」
  const workPolish =
    mode === "work"
      ? s === bag
        ? 3
        : (s === "black" && bag === "navy") || (s === "navy" && bag === "black")
        ? 2
        : 0
      : 0;

  // 普段：差し色は「どちらか1点」がちょうどいい
  const isAccent = (c: ColorTag) => c === "color" || c === "pattern";
  const casualAccent =
    mode === "casual"
      ? isAccent(s) && isAccent(bag)
        ? -2 // 両方アクセントはやりすぎ
        : isAccent(s) || isAccent(bag)
        ? 2 // どちらか1点アクセントで垢抜け
        : 0
      : 0;

  // 仕事：柄アイテム（靴/バッグ/アクセ）が多いと落ち着きに欠ける
  const workTight =
    mode === "work"
      ? (acc === "pattern" ? -1 : 0) +
        (bag === "pattern" ? -1 : 0) +
        (s === "pattern" ? -1 : 0)
      : 0;

  return base + weather + workPolish + casualAccent + workTight;
}

/** iPhone向け：Canvasで合成して共有/保存 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.width / img.height;
  const tr = w / h;

  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (ir > tr) {
    sh = img.height;
    sw = sh * tr;
    sx = (img.width - sw) / 2;
  } else {
    sw = img.width;
    sh = sw / tr;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function weatherLabel(w: WeatherInfo | null): string {
  if (!w || w.temp == null) return "天気取得中…";
  const t = Math.round(w.temp);
  const min = w.tmin != null ? Math.round(w.tmin) : null;
  const max = w.tmax != null ? Math.round(w.tmax) : null;
  const p = w.precip != null ? Math.round(w.precip) : null;

  const range = min != null && max != null ? `（${min}〜${max}℃）` : "";
  const rain = p != null ? ` / 降水${p}%` : "";
  return `${w.city} ${t}℃ ${range}${rain}`;
}

export default function Home() {
  const [category, setCategory] = useState<Category>("tops");
  const [mode, setMode] = useState<Mode>("casual");
  const [selectedColor, setSelectedColor] = useState<ColorTag>("black");

  const [clothes, setClothes] = useState<Clothes>({
    tops: [],
    bottoms: [],
    outers: [],
    shoes: [],
    bags: [],
    accessories: [],
  });

  const [coordination, setCoordination] = useState<{
    tops?: Item;
    bottoms?: Item;
    outers?: Item;
    shoes?: Item;
    bags?: Item;
    accessories?: Item;
    reason?: string;
  }>({});

  const [isExporting, setIsExporting] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  const canGenerate = useMemo(() => {
    return (
      clothes.tops.length > 0 &&
      clothes.bottoms.length > 0 &&
      clothes.outers.length > 0 &&
      clothes.shoes.length > 0 &&
      clothes.bags.length > 0 &&
      clothes.accessories.length > 0
    );
  }, [clothes]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 古いデータでも落ちないように補完
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

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/weather", { cache: "no-store" });
        if (!res.ok) throw new Error("weather fetch failed");
        const json = await res.json();
        if (json?.error) throw new Error(json?.message ?? "weather error");
        setWeather(json);
      } catch {
        setWeather(null);
      }
    };
    run();
  }, []);

  const saveToStorage = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const labelOf = (cat: Category) => {
    if (cat === "tops") return "トップス";
    if (cat === "bottoms") return "ボトムス";
    if (cat === "outers") return "アウター";
    if (cat === "shoes") return "靴";
    if (cat === "bags") return "バッグ";
    return "アクセ";
  };

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

  // ✅ コーデだけ消す（登録は残す）
  const handleReset = () => {
    setCoordination({});
  };

  const generateCoordination = () => {
    if (!canGenerate) {
      alert("すべてのカテゴリを1つ以上登録してね（トップス/ボトムス/アウター/靴/バッグ/アクセ）");
      return;
    }

    const temp = weather?.temp ?? null;
    const precip = weather?.precip ?? null;

    const scored: {
      t: Item;
      b: Item;
      o: Item;
      s: Item;
      bag: Item;
      acc: Item;
      score: number;
    }[] = [];

    for (const t of clothes.tops) {
      for (const b of clothes.bottoms) {
        for (const o of clothes.outers) {
          for (const s of clothes.shoes) {
            for (const bag of clothes.bags) {
              for (const acc of clothes.accessories) {
                scored.push({
                  t,
                  b,
                  o,
                  s,
                  bag,
                  acc,
                  score: scoreOutfit6(
                    t.color,
                    b.color,
                    o.color,
                    s.color,
                    bag.color,
                    acc.color,
                    mode,
                    temp,
                    precip
                  ),
                });
              }
            }
          }
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topK = scored.slice(0, Math.min(8, scored.length));
    const picked = pickRandom(topK);

    const tempLine =
      temp == null
        ? ""
        : temp >= 20
        ? `今日は${Math.round(temp)}℃なので、重く見えにくいアウター寄りにしました。`
        : temp <= 12
        ? `今日は${Math.round(temp)}℃なので、締まる色のアウターで引き締めました。`
        : `今日は${Math.round(temp)}℃なので、バランス重視で組みました。`;

    const rainLine =
      precip != null && precip >= 40
        ? `降水${Math.round(precip)}%なので、淡色の靴/バッグは少し避けています。`
        : "";

    const baseReason =
      mode === "work"
        ? `無難に失敗しにくい配色（${COLOR_LABEL[picked.t.color]}×${COLOR_LABEL[picked.b.color]}）を軸に、靴とバッグで整えました。`
        : `合わせやすい配色（${COLOR_LABEL[picked.t.color]}×${COLOR_LABEL[picked.b.color]}）に、小物で“ちょい垢抜け”を足しました。`;

    const itemLine = `靴：${COLOR_LABEL[picked.s.color]} / バッグ：${COLOR_LABEL[picked.bag.color]} / アクセ：${COLOR_LABEL[picked.acc.color]}`;

    const reason = [baseReason, itemLine, tempLine, rainLine].filter(Boolean).join(" ");

    setCoordination({
      tops: picked.t,
      bottoms: picked.b,
      outers: picked.o,
      shoes: picked.s,
      bags: picked.bag,
      accessories: picked.acc,
      reason,
    });
  };

  const exportOutfitImage = async () => {
    if (
      !coordination.tops ||
      !coordination.bottoms ||
      !coordination.outers ||
      !coordination.shoes ||
      !coordination.bags ||
      !coordination.accessories
    ) {
      alert("先にコーデを生成してね！");
      return;
    }

    try {
      setIsExporting(true);

      const W = 900;
      const H = 1400;
      const P = 40;
      const GAP = 22;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context not found");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#111111";
      ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
      ctx.fillText("今日これ", P, 56);

      ctx.fillStyle = "#666666";
      ctx.font = "24px system-ui, -apple-system, sans-serif";
      ctx.fillText(mode === "work" ? "仕事コーデ" : "普段コーデ", P, 92);

      ctx.fillStyle = "#888888";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.fillText(weatherLabel(weather), P, 118);

      const [topsImg, outersImg, bottomsImg, shoesImg, bagImg, accImg] =
        await Promise.all([
          loadImage(coordination.tops.image),
          loadImage(coordination.outers.image),
          loadImage(coordination.bottoms.image),
          loadImage(coordination.shoes.image),
          loadImage(coordination.bags.image),
          loadImage(coordination.accessories.image),
        ]);

      const topY = 140;

      // Row1: tops + outers
      const cardW = (W - P * 2 - GAP) / 2;
      const cardH = 320;
      const row1Y = topY;

      // Row2: bottoms full
      const row2Y = row1Y + cardH + GAP;
      const bottomH = 360;

      // Row3: shoes + bag
      const row3Y = row2Y + bottomH + GAP;
      const row3H = 280;

      // Row4: accessory full small
      const row4Y = row3Y + row3H + GAP;
      const accH = H - row4Y - P;

      const drawCard = (x: number, y: number, w: number, h: number) => {
        ctx.save();
        roundRect(ctx, x, y, w, h, 28);
        ctx.clip();
        ctx.fillStyle = "#F5F5F7";
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      };

      ctx.fillStyle = "#666";
      ctx.font = "20px system-ui, -apple-system, sans-serif";

      const inner = 16;

      // Tops
      const topsX = P;
      drawCard(topsX, row1Y, cardW, cardH);
      ctx.save();
      roundRect(ctx, topsX, row1Y, cardW, cardH, 28);
      ctx.clip();
      ctx.fillText(`トップス（${COLOR_LABEL[coordination.tops.color]}）`, topsX + inner, row1Y + 38);
      drawCover(ctx, topsImg, topsX + inner, row1Y + 56, cardW - inner * 2, cardH - 72);
      ctx.restore();

      // Outers
      const outersX = P + cardW + GAP;
      drawCard(outersX, row1Y, cardW, cardH);
      ctx.save();
      roundRect(ctx, outersX, row1Y, cardW, cardH, 28);
      ctx.clip();
      ctx.fillText(`アウター（${COLOR_LABEL[coordination.outers.color]}）`, outersX + inner, row1Y + 38);
      drawCover(ctx, outersImg, outersX + inner, row1Y + 56, cardW - inner * 2, cardH - 72);
      ctx.restore();

      // Bottoms full
      drawCard(P, row2Y, W - P * 2, bottomH);
      ctx.save();
      roundRect(ctx, P, row2Y, W - P * 2, bottomH, 28);
      ctx.clip();
      ctx.fillText(`ボトムス（${COLOR_LABEL[coordination.bottoms.color]}）`, P + inner, row2Y + 38);
      drawCover(ctx, bottomsImg, P + inner, row2Y + 56, W - P * 2 - inner * 2, bottomH - 72);
      ctx.restore();

      // Shoes
      drawCard(P, row3Y, cardW, row3H);
      ctx.save();
      roundRect(ctx, P, row3Y, cardW, row3H, 28);
      ctx.clip();
      ctx.fillText(`靴（${COLOR_LABEL[coordination.shoes.color]}）`, P + inner, row3Y + 38);
      drawCover(ctx, shoesImg, P + inner, row3Y + 56, cardW - inner * 2, row3H - 72);
      ctx.restore();

      // Bag
      drawCard(outersX, row3Y, cardW, row3H);
      ctx.save();
      roundRect(ctx, outersX, row3Y, cardW, row3H, 28);
      ctx.clip();
      ctx.fillText(`バッグ（${COLOR_LABEL[coordination.bags.color]}）`, outersX + inner, row3Y + 38);
      drawCover(ctx, bagImg, outersX + inner, row3Y + 56, cardW - inner * 2, row3H - 72);
      ctx.restore();

      // Accessory full
      drawCard(P, row4Y, W - P * 2, accH);
      ctx.save();
      roundRect(ctx, P, row4Y, W - P * 2, accH, 28);
      ctx.clip();
      ctx.fillText(`アクセ（${COLOR_LABEL[coordination.accessories.color]}）`, P + inner, row4Y + 38);
      drawCover(ctx, accImg, P + inner, row4Y + 56, W - P * 2 - inner * 2, accH - 72);
      ctx.restore();

      ctx.fillStyle = "#AAAAAA";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.fillText("© kyoukore", P, H - 18);

      const dataUrl = canvas.toDataURL("image/png");
      const filename = `kyoukore_${mode}_${Date.now()}.png`;

      const canShare =
        typeof navigator !== "undefined" &&
        // @ts-ignore
        typeof navigator.share === "function" &&
        // @ts-ignore
        typeof navigator.canShare === "function";

      if (canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: "image/png" });
          // @ts-ignore
          if (navigator.canShare({ files: [file] })) {
            // @ts-ignore
            await navigator.share({
              title: "今日これ",
              text: "今日のコーデ",
              files: [file],
            });
            return;
          }
        } catch {
          // ignore → fallback
        }
      }

      downloadDataUrl(dataUrl, filename);
    } catch (e) {
      console.error(e);
      alert("画像の保存に失敗しました（もう一度試してね）");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-wide">今日これ</h1>
        <p className="text-sm text-slate-500 mt-1">smart outfit assistant</p>
        <div className="h-[2px] w-16 bg-rose-200 mx-auto mt-3 rounded-full"></div>

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-sm text-slate-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-300"></span>
          <span>{weatherLabel(weather)}</span>
        </div>
      </div>

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
          <div className="text-xs text-slate-500">
            服は変えずに、色×天気×小物で「失敗しにくい垢抜け」を作ります。
          </div>
        </div>

        {/* Upload */}
        <label className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl cursor-pointer">
          ＋ {labelOf(category)}を追加（最大{MAX_PER_CATEGORY}）
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
                onClick={() => handleDelete(category, index)}
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
            text-white
            tracking-wide
            bg-[linear-gradient(to_bottom,#F4B6C2,#E78CA5,#C85C8E)]
            shadow-[0_6px_18px_rgba(200,92,142,0.25)]
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
          コーデをクリア
        </button>

        {/* Result */}
        {coordination.tops &&
          coordination.bottoms &&
          coordination.outers &&
          coordination.shoes &&
          coordination.bags &&
          coordination.accessories && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-800">
                  {mode === "work" ? "仕事コーデ" : "普段コーデ"}
                </div>
                <div className="text-xs text-slate-600 mt-1">{coordination.reason}</div>
              </div>

              {/* まとめ表示 */}
              <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <div className="px-3 py-2 text-xs text-slate-600">
                      トップス（{COLOR_LABEL[coordination.tops.color]}）
                    </div>
                    <img src={coordination.tops.image} className="w-full h-44 object-cover" />
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <div className="px-3 py-2 text-xs text-slate-600">
                      アウター（{COLOR_LABEL[coordination.outers.color]}）
                    </div>
                    <img src={coordination.outers.image} className="w-full h-44 object-cover" />
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <div className="px-3 py-2 text-xs text-slate-600">
                    ボトムス（{COLOR_LABEL[coordination.bottoms.color]}）
                  </div>
                  <img src={coordination.bottoms.image} className="w-full h-56 object-cover" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <div className="px-3 py-2 text-xs text-slate-600">
                      靴（{COLOR_LABEL[coordination.shoes.color]}）
                    </div>
                    <img src={coordination.shoes.image} className="w-full h-40 object-cover" />
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <div className="px-3 py-2 text-xs text-slate-600">
                      バッグ（{COLOR_LABEL[coordination.bags.color]}）
                    </div>
                    <img src={coordination.bags.image} className="w-full h-40 object-cover" />
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <div className="px-3 py-2 text-xs text-slate-600">
                    アクセ（{COLOR_LABEL[coordination.accessories.color]}）
                  </div>
                  <img src={coordination.accessories.image} className="w-full h-40 object-cover" />
                </div>
              </div>

              <button
                onClick={exportOutfitImage}
                disabled={isExporting}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  isExporting
                    ? "bg-slate-200 text-slate-500"
                    : "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]"
                }`}
              >
                {isExporting ? "画像を作成中…" : "画像として保存 / 共有"}
              </button>
            </div>
          )}
      </div>
    </main>
  );
}