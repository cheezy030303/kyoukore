"use client";

import { useEffect, useMemo, useRef, useState } from "react";


type Clothes = {
  tops: string[];
  bottoms: string[];
  outers: string[];
};

type Outfit = {
  id: string;
  mode: "work" | "casual";
  createdAt: number;
  tops: string;
  bottoms: string;
  outers: string;
};

const STORAGE_KEY = "clothesData";
const OUTFITS_KEY = "outfitHistory";
const MAX_OUTFITS = 20;

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
        <div className="font-semibold whitespace-nowrap text-sm">{label}</div>
        <div className="text-xs text-gray-500">{count}/5</div>
      </div>
    </button>
  );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
  // @ts-ignore
  if (document.fonts?.ready) {
    // @ts-ignore
    await document.fonts.ready;
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // dataURLなので基本不要だけど念のため
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
  // object-fit: cover をcanvasで再現
  const ir = img.width / img.height;
  const tr = w / h;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (ir > tr) {
    // 横長 → 横を切る
    sh = img.height;
    sw = sh * tr;
    sx = (img.width - sw) / 2;
  } else {
    // 縦長 → 縦を切る
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

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const outfitRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canGenerate = useMemo(
    () => clothes.tops.length > 0 && clothes.bottoms.length > 0 && clothes.outers.length > 0,
    [clothes]
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setClothes(JSON.parse(saved));

    const savedOutfits = localStorage.getItem(OUTFITS_KEY);
    if (savedOutfits) setOutfits(JSON.parse(savedOutfits));
  }, []);

  const saveClothes = (data: Clothes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const saveOutfits = (data: Outfit[]) => {
    localStorage.setItem(OUTFITS_KEY, JSON.stringify(data));
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
    saveClothes(updated);
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

  const handleDelete = (index: number) => {
    const removed = clothes[category][index];

    const updated = {
      ...clothes,
      [category]: clothes[category].filter((_, i) => i !== index),
    };

    setClothes(updated);
    saveClothes(updated);

    setCoordination((prev) => {
      const values = Object.values(prev).filter(Boolean) as string[];
      if (values.includes(removed)) return {};
      return prev;
    });

    setOutfits((prev) => {
      const filtered = prev.filter(
        (o) => o.tops !== removed && o.bottoms !== removed && o.outers !== removed
      );
      if (filtered.length !== prev.length) saveOutfits(filtered);
      return filtered;
    });
  };

  const saveCurrentOutfit = () => {
    if (!coordination.tops || !coordination.bottoms || !coordination.outers) {
      alert("先にコーデを生成してね！");
      return;
    }

    const newOutfit: Outfit = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode,
      createdAt: Date.now(),
      tops: coordination.tops,
      bottoms: coordination.bottoms,
      outers: coordination.outers,
    };

    const next = [newOutfit, ...outfits].slice(0, MAX_OUTFITS);
    setOutfits(next);
    saveOutfits(next);
  };

  const loadOutfit = (o: Outfit) => {
    setMode(o.mode);
    setCoordination({ tops: o.tops, bottoms: o.bottoms, outers: o.outers });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteOutfit = (id: string) => {
    const next = outfits.filter((o) => o.id !== id);
    setOutfits(next);
    saveOutfits(next);
  };

  const clearOutfits = () => {
    if (!confirm("履歴をすべて削除しますか？")) return;
    setOutfits([]);
    localStorage.removeItem(OUTFITS_KEY);
  };

  // ✅ iPhoneで白くなりがちな問題を避ける：html2canvas
  const exportOutfitImage = async () => {
    if (!coordination.tops || !coordination.bottoms || !coordination.outers) {
      alert("先にコーデを生成してね！");
      return;
    }
  
    try {
      setIsExporting(true);
  
      const W = 900;
      const H = 1200;
      const P = 40;
      const GAP = 24;
  
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
  
      const [topsImg, outersImg, bottomsImg] = await Promise.all([
        loadImage(coordination.tops),
        loadImage(coordination.outers),
        loadImage(coordination.bottoms),
      ]);
  
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
  
      // tops
      ctx.save();
      roundRect(ctx, topsX, topY, cardW, cardH, 28);
      ctx.clip();
      drawCover(ctx, topsImg, topsX + inner, topY + 56, cardW - inner * 2, cardH - 72);
      ctx.restore();
      ctx.fillStyle = "#666";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.fillText("トップス", topsX + inner, topY + 38);
  
      // outers
      ctx.save();
      roundRect(ctx, outersX, topY, cardW, cardH, 28);
      ctx.clip();
      drawCover(ctx, outersImg, outersX + inner, topY + 56, cardW - inner * 2, cardH - 72);
      ctx.restore();
      ctx.fillStyle = "#666";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.fillText("アウター", outersX + inner, topY + 38);
  
      // bottoms
      ctx.save();
      roundRect(ctx, P, bottomY, bottomW, bottomH, 28);
      ctx.clip();
      drawCover(ctx, bottomsImg, P + inner, bottomY + 56, bottomW - inner * 2, bottomH - 72);
      ctx.restore();
      ctx.fillStyle = "#666";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.fillText("ボトムス", P + inner, bottomY + 38);
  
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
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "image/png" });
        // @ts-ignore
        // @ts-ignore
if (navigator.canShare({ files: [file] })) {
  try {
    // @ts-ignore
    await navigator.share({
      title: "今日これ",
      text: "今日のコーデ",
      files: [file],
    });
    // ✅ 共有できたら成功として終了
    return;
  } catch (err) {
    // ✅ iPhoneは「キャンセル」でもエラーになることがあるので、無視して次へ
    console.log("share canceled or failed:", err);
  }
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
    <main className="min-h-screen flex justify-center bg-gradient-to-b from-[#F7F2FF] via-[#F3FAFF] to-white">
      <div className="w-[390px] min-h-screen px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">今日これ</h1>
              <p className="text-sm text-gray-500 mt-1">迷わない朝をつくる</p>
            </div>
            <div className="rounded-2xl bg-white/70 border border-black/5 px-3 py-2 text-xs text-gray-600 shadow-sm">
              free
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl bg-white/80 shadow-sm border border-black/5 p-4">
          {/* Mode */}
          <div className="flex gap-2 justify-center">
            <Pill active={mode === "work"} onClick={() => setMode("work")}>
              仕事着
            </Pill>
            <Pill active={mode === "casual"} onClick={() => setMode("casual")}>
              普段着
            </Pill>
          </div>

          {/* Category */}
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

          {/* Grid with delete */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {clothes[category].map((item, index) => (
              <div
                key={index}
                className="relative rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => handleDelete(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 text-white rounded-full text-xs flex items-center justify-center shadow active:scale-90 transition"
                  aria-label="delete"
                >
                  ×
                </button>
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

        {/* ✅ 1枚コーデ：崩れない固定コラージュ */}
        {coordination.tops && (
          <div className="mt-4 rounded-3xl bg-white/80 shadow-sm border border-black/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{mode === "work" ? "仕事コーデ 👔" : "普段コーデ 👕"}</h2>
              <div className="flex gap-2">
                <button
                  onClick={saveCurrentOutfit}
                  className="rounded-full bg-black text-white px-3 py-1 text-xs font-semibold shadow active:scale-[0.99] transition"
                >
                  保存
                </button>
                <button
                  onClick={generateCoordination}
                  className="rounded-full bg-white border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm active:scale-[0.99] transition"
                >
                  もう一回
                </button>
              </div>
            </div>

            {/* 画像化する範囲 */}
            <div
              ref={outfitRef}
              className="mt-3 rounded-3xl bg-white border border-black/5 overflow-hidden p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">今日これ</div>
                <div className="text-xs text-gray-500">{mode === "work" ? "仕事" : "普段"}</div>
              </div>

              <div className="w-full aspect-[3/4] rounded-3xl bg-gray-50 border border-black/5 overflow-hidden p-3">
                {/* 上段：トップス左 / アウター右 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white border border-black/5 overflow-hidden shadow-sm">
                    <div className="px-3 py-2 text-[10px] text-gray-500">トップス</div>
                    <img src={coordination.tops} className="w-full h-[220px] object-cover" />
                  </div>

                  <div className="rounded-2xl bg-white border border-black/5 overflow-hidden shadow-sm">
                    <div className="px-3 py-2 text-[10px] text-gray-500">アウター</div>
                    <img src={coordination.outers} className="w-full h-[220px] object-cover" />
                  </div>
                </div>

                {/* 下段：ボトムス */}
                <div className="mt-3 rounded-2xl bg-white border border-black/5 overflow-hidden shadow-sm">
                  <div className="px-3 py-2 text-[10px] text-gray-500">ボトムス</div>
                  <img src={coordination.bottoms} className="w-full h-[260px] object-cover" />
                </div>
              </div>

              <div className="mt-2 text-[10px] text-gray-400 text-center">© kyoukore</div>
            </div>

            <button
              onClick={exportOutfitImage}
              disabled={isExporting}
              className={[
                "mt-4 w-full rounded-2xl py-3 font-semibold shadow transition",
                isExporting ? "bg-gray-200 text-gray-500" : "bg-black text-white active:scale-[0.99]",
              ].join(" ")}
            >
              {isExporting ? "画像を作成中…" : "画像として保存 / 共有"}
            </button>
          </div>
        )}

        {/* ✅ 履歴 */}
        <div className="mt-4 rounded-3xl bg-white/70 backdrop-blur border border-black/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">履歴</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="rounded-full bg-white border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm"
              >
                {showHistory ? "閉じる" : "開く"}
              </button>
              <button
                onClick={clearOutfits}
                className="rounded-full bg-white border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm"
              >
                全消し
              </button>
            </div>
          </div>

          {showHistory && (
            <div className="mt-3 space-y-3">
              {outfits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-center">
                  <div className="text-sm font-semibold">まだ履歴がないよ</div>
                  <div className="text-xs text-gray-500 mt-1">コーデ生成 →「保存」で残せます</div>
                </div>
              ) : (
                outfits.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden"
                  >
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {o.mode === "work" ? "仕事" : "普段"} ・ {formatDate(o.createdAt)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadOutfit(o)}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-black text-white shadow"
                        >
                          表示
                        </button>
                        <button
                          onClick={() => deleteOutfit(o.id)}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-black/10 shadow-sm"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 p-2 bg-gray-50">
                      <img src={o.tops} className="w-full h-24 object-cover rounded-xl" />
                      <img src={o.bottoms} className="w-full h-24 object-cover rounded-xl" />
                      <img src={o.outers} className="w-full h-24 object-cover rounded-xl" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">© {new Date().getFullYear()} kyoukore</div>
      </div>
    </main>
  );
}