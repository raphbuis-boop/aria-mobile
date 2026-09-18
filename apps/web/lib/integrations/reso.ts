import { env } from "@/lib/env";

type ResoProperty = {
  ListingKey?: string;
  UnparsedAddress?: string;
  City?: string;
  StateOrProvince?: string;
  PostalCode?: string;
  ListPrice?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  ElementarySchoolDistrict?: string;
  Media?: Array<{ MediaURL?: string }>;
};

async function resoAccessToken() {
  const existing = env.resoBearerToken();
  if (existing) return existing;

  const tokenUrl = env.resoTokenUrl();
  const clientId = env.resoClientId();
  const clientSecret = env.resoClientSecret();
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error("RESO credentials are incomplete");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`RESO token request failed (${response.status})`);
  }

  const json = (await response.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchResoProperty(listingKey: string) {
  const baseUrl = env.resoBaseUrl();
  if (!baseUrl) throw new Error("RESO_WEB_API_BASE_URL is not set");

  const token = await resoAccessToken();
  const url = new URL("Property", `${baseUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("$filter", `ListingKey eq '${listingKey}'`);
  url.searchParams.set("$expand", "Media");
  url.searchParams.set("$top", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": process.env.RESO_USER_AGENT ?? "AriaAI/0.1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RESO Property lookup failed (${response.status})`);
  }

  const json = (await response.json()) as { value?: ResoProperty[] };
  return json.value?.[0] ?? null;
}

export function mapResoProperty(listing: ResoProperty) {
  return {
    listing_key: listing.ListingKey ?? null,
    address_line: listing.UnparsedAddress ?? "Unknown address",
    city: listing.City ?? "",
    state: listing.StateOrProvince ?? "",
    postal_code: listing.PostalCode ?? "",
    list_price: listing.ListPrice ?? null,
    beds: listing.BedroomsTotal ?? null,
    baths: listing.BathroomsTotalInteger ?? null,
    living_area_sqft: listing.LivingArea ?? null,
    school_district: listing.ElementarySchoolDistrict ?? null,
    photo_url: listing.Media?.[0]?.MediaURL ?? null,
    raw_mls: listing,
    last_synced_at: new Date().toISOString(),
  };
}
