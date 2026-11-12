import { getTodayIso } from "../../../lib/dates";
import { parseFuelPriceValue } from "../../../lib/fuel-price";

type FuelCode = "gasoline" | "diesel";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2016-01-01";
const SERVICE_URL = "https://lisansws.epdk.gov.tr/services/bildirimPetrol8FirmaBulten.bildirimPetrol8FirmaBultenHttpSoap11Endpoint";

function toEpdkDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function decodeXml(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function normalize(value: string) {
  return value
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function parseFuelPrice(xmlText: string, fuel: FuelCode) {
  const xml = decodeXml(xmlText);
  const itemPattern = /<(?:\w+:)?PetrolPiyasasiEnYuksekHacimliSekizFirmaninAkaryakitFiyatlari[^>]*>([\s\S]*?)<\/(?:\w+:)?PetrolPiyasasiEnYuksekHacimliSekizFirmaninAkaryakitFiyatlari>/gi;
  const records = Array.from(xml.matchAll(itemPattern), (match) => match[1]);

  for (const record of records) {
    const fuelName = readTag(record, "YakitTipi");
    const normalizedName = normalize(fuelName);
    const matchesFuel = fuel === "gasoline"
      ? normalizedName.includes("BENZIN") && (normalizedName.includes("95") || !normalizedName.includes("98"))
      : normalizedName.includes("MOTORIN");

    if (!matchesFuel) continue;
    return parseFuelPriceValue(readTag(record, "Fiyat"));
  }

  throw new Error(fuel === "gasoline" ? "Benzin fiyatı okunamadı." : "Motorin fiyatı okunamadı.");
}

function subtractDaysIso(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function fetchFuelPriceForDate(date: string, fuel: FuelCode) {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:gen="http://genel.service.ws.epvys.g222.tubitak.gov.tr/">
  <soapenv:Header/>
  <soapenv:Body>
    <gen:genelSorgu>
      <sorguNo>71</sorguNo>
      <parametreler>${toEpdkDate(date)}</parametreler>
    </gen:genelSorgu>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(SERVICE_URL, {
    method: "POST",
    headers: {
      Accept: "text/xml",
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "genelSorgu",
      "User-Agent": "ParaHesaplayici/1.0",
    },
    body: soapBody,
    cf: { cacheTtl: 86400, cacheEverything: true },
  } as RequestInit);

  if (!response.ok) throw new Error("EPDK akaryakıt veri kaynağı şu anda yanıt vermiyor.");

  return parseFuelPrice(await response.text(), fuel);
}

async function fetchFuelPrice(requestedDate: string, fuel: FuelCode) {
  let lastError: unknown;

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const actualDate = subtractDaysIso(requestedDate, dayOffset);
    if (actualDate < MIN_DATE) break;

    try {
      return {
        requestedDate,
        actualDate,
        pricePerLiter: await fetchFuelPriceForDate(actualDate, fuel),
      };
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.includes("yanıt vermiyor")) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(fuel === "gasoline" ? "Benzin fiyatı okunamadı." : "Motorin fiyatı okunamadı.");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate") || "";
  const targetDate = url.searchParams.get("targetDate") || "";
  const fuel = url.searchParams.get("fuel") || "";

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(targetDate)) {
    return Response.json({ error: "Tarih biçimi geçersiz." }, { status: 400 });
  }

  if (fuel !== "gasoline" && fuel !== "diesel") {
    return Response.json({ error: "Akaryakıt türü geçersiz." }, { status: 400 });
  }

  if (startDate < MIN_DATE || targetDate > getTodayIso() || startDate >= targetDate) {
    return Response.json({ error: "Akaryakıt için tarih aralığı 1 Ocak 2016 ile bugün arasında olmalıdır." }, { status: 400 });
  }

  try {
    const [start, target] = await Promise.all([
      fetchFuelPrice(startDate, fuel),
      fetchFuelPrice(targetDate, fuel),
    ]);

    return Response.json(
      { start, target, source: "EPDK en yüksek işlem hacimli 8 firma ortalaması" },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Akaryakıt fiyatı alınamadı." },
      { status: 502 },
    );
  }
}
