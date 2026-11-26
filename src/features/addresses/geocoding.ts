export type AddressSuggestion = { address_line: string; district: string };

/** Only address properties are used. POI names are not street addresses. */
export function parseAddressSuggestion(value: unknown): AddressSuggestion {
  const root = value as { features?: { properties?: Record<string, unknown> }[] } | null;
  const properties = root?.features?.[0]?.properties;
  const text = (key: string, max: number) => typeof properties?.[key] === "string" ? (properties[key] as string).trim().slice(0, max) : "";
  const street = text("street", 250);
  return { address_line: street ? [street, text("housenumber", 40)].filter(Boolean).join(" ") : "", district: text("district", 120) || text("city", 120) };
}
