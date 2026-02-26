"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "tops" | "bottoms" | "outers";
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

const STORAGE_KEY = "clothesData_v3"; // v3にして衝突回避
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

/** 色相性スコア（無料AI風） */
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

function scoreOutfit(t: ColorTag, b: ColorTag, o: ColorTag, mode: Mode): number {
  return scorePair(t, b, mode) * 3 + scorePair(o, t, mode) + scorePair(o, b, mode);
}

/** iPhone向け：画像をCanvasで合成して共有/保存（DOMキャプチャしない） */
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

  let sx = 0, sy = 0, sw = img.width, sh = img.height;

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export default function Home() {
  const [category, setCategory] = useState<Category>("tops");
  const [mode, setMode] = useState<Mode>("casual");

  const [selectedColor, setSelectedColor] = useState<ColorTag>("black");

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

  const [isExporting, setIsExporting] = useState(false);

  const canGenerate = useMemo(
    () => clothes.tops.length > 0 && clothes.bottoms.length > 0 && clothes.outers.length > 0,
    [clothes]
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setClothes(JSON.parse(saved));
      } catch {
        // 破損してたら無視
      }
    }
  }, []);

  const saveToStorage = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const labelOf = (cat: Category) =>
    cat === "tops" ? "トップス" : cat === "bottoms" ? "ボトムス" : "アウター";

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
        ? `落ち着いた配色（${COLOR_LABEL[picked.t.color]}×${COLOR_LABEL[picked.b.color]}）を軸に、${COLOR_LABEL[picked.o.color]}で全体を整えました。`
        : `合わせやすい配色（${COLOR_LABEL[picked.t.color]}×${COLOR_LABEL[picked.b.color]}）に、${COLOR_LABEL[picked.o.color]}でバランスを取りました。`;

    setCoordination({ tops: picked.t, bottoms: picked.b, outers: picked.o, reason });
  };

  const exportOutfitImage = async () => {
    if (!coordination.tops || !coordination.bottoms || !coordination.outers) {
      alert("先にコーデを生成してね！");
      return;
    }

    try {
      setIsExporting(true);

      // iPhone向けにほどほどサイズ
      const W = 900;
      const H = 1200;
      const P = 40;
      const GAP = 24;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context not found");

      // 背景
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // タイトル
      ctx.fillStyle = "#111111";
      ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
      ctx.fillText("今日これ", P, 56);

      ctx.fillStyle = "#666666";
      ctx.font = "24px system-ui, -apple-system, sans-serif";
      ctx.fillText(mode === "work" ? "仕事コーデ" : "普段コーデ", P, 92);

      const [topsImg, outersImg, bottomsImg] = await Promise.all([
        loadImage(coordination.tops.image),
        loadImage(coordination.outers.image),
        loadImage(coordination.bottoms.image),
      ]);

      // 上段2枚 + 下段1枚（コラージュ固定）
      const topY = 120;
      const cardW = (W - P * 2 - GAP) / 2;
      const cardH = 380;

      const bottomY = topY + cardH + GAP;
      const bottomW = W - P * 2;
      const bottomH = H - bottomY - P;

      const drawCard = (x: number, y: number, w: number, h: number) => {
        ctx.save();
        roundRect(ctx, x, y, w, h, 28);
        ctx.clip();
        ctx.fillStyle = "#F5F5F7";
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      };

      const topsX = P;
      const outersX = P + cardW + GAP;

      drawCard(topsX, topY, cardW, cardH);
      drawCard(outersX, topY, cardW, cardH);
      drawCard(P, bottomY, bottomW, bottomH);

      const inner = 16;

      // ラベル
      ctx.fillStyle = "#666";
      ctx.font = "20px system-ui, -apple-system, sans-serif";

      // tops
      ctx.save();
      roundRect(ctx, topsX, topY, cardW, cardH, 28);
      ctx.clip();
      ctx.fillText(`トップス（${COLOR_LABEL[coordination.tops.color]}）`, topsX + inner, topY + 38);
      drawCover(ctx, topsImg, topsX + inner, topY + 56, cardW - inner * 2, cardH - 72);
      ctx.restore();

      // outers
      ctx.save();
      roundRect(ctx, outersX, topY, cardW, cardH, 28);
      ctx.clip();
      ctx.fillText(`アウター（${COLOR_LABEL[coordination.outers.color]}）`, outersX + inner, topY + 38);
      drawCover(ctx, outersImg, outersX + inner, topY + 56, cardW - inner * 2, cardH - 72);
      ctx.restore();

      // bottoms
      ctx.save();
      roundRect(ctx, P, bottomY, bottomW, bottomH, 28);
      ctx.clip();
      ctx.fillText(`ボトムス（${COLOR_LABEL[coordination.bottoms.color]}）`, P + inner, bottomY + 38);
      drawCover(ctx, bottomsImg, P + inner, bottomY + 56, bottomW - inner * 2, bottomH - 72);
      ctx.restore();

      // フッター
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
        } catch (err) {
          console.log("share canceled or failed:", err);
        }
      }

      // PC用
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
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-wide">今日これ</h1>
        <p className="text-sm text-slate-500 mt-1">smart outfit assistant</p>
        <div className="h-[2px] w-16 bg-rose-300mx-auto mt-3 rounded-full"></div>
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
                  ? "border-rose-300 text-rose-500 bg-rose-50"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {labelOf(cat)}
            </button>
          ))}
        </div>

        {/* ✅ 色選択（ここが必ず出ます） */}
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
          <div className="text-xs text-slate-500">今は色だけで“AIっぽく”組み合わせます。</div>
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
    text-white
    tracking-wide
    bg-[linear-gradient(to_bottom,#F9A8D4,#F472B6,#DB2777)]
    shadow-[0_6px_18px_rgba(219,39,119,0.25)]
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

        {/* ✅ 結果：1枚カードで3枚コラージュ */}
        {coordination.tops && coordination.bottoms && coordination.outers && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">
                {mode === "work" ? "仕事コーデ" : "普段コーデ"}
              </div>
              <div className="text-xs text-slate-600 mt-1">{coordination.reason}</div>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-white p-3">
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

              <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-white">
                <div className="px-3 py-2 text-xs text-slate-600">
                  ボトムス（{COLOR_LABEL[coordination.bottoms.color]}）
                </div>
                <img src={coordination.bottoms.image} className="w-full h-56 object-cover" />
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