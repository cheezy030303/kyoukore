export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // 東京（だいたい中心）
  const lat = 35.6762;
  const lon = 139.6503;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FTokyo`;

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Weather fetch failed: ${res.status}`);
    }

    const data = await res.json();

    const current = data.current ?? {};
    const daily = data.daily ?? {};

    return Response.json({
      city: "Tokyo",
      temp: current.temperature_2m ?? null,
      feels: current.apparent_temperature ?? null,
      code: current.weather_code ?? null,
      tmax: Array.isArray(daily.temperature_2m_max)
        ? daily.temperature_2m_max[0]
        : null,
      tmin: Array.isArray(daily.temperature_2m_min)
        ? daily.temperature_2m_min[0]
        : null,
      precip: Array.isArray(daily.precipitation_probability_max)
        ? daily.precipitation_probability_max[0]
        : null,
      time: current.time ?? null,
    });
  } catch (error: any) {
    return Response.json(
      {
        error: "weather_error",
        message: error?.message ?? "unknown error",
      },
      { status: 500 }
    );
  }
}