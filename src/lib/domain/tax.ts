/**
 * GST on ready-made garments in India (rates from the September 2025 GST revision):
 * 5% when the piece sells for ₹2,500 or less, 18% above that.
 * TODO: have the owner's accountant confirm rates and HSN codes before launch.
 */
export const APPAREL_GST_THRESHOLD = 250000; // ₹2,500 in paise
export const APPAREL_GST_LOW = 0.05;
export const APPAREL_GST_HIGH = 0.18;

/** GST rate for one garment at this selling price (paise, per piece). */
export function apparelGstRate(pricePaise: number): number {
  if (!Number.isInteger(pricePaise) || pricePaise < 0) throw new Error(`Invalid price: ${pricePaise}`);
  return pricePaise <= APPAREL_GST_THRESHOLD ? APPAREL_GST_LOW : APPAREL_GST_HIGH;
}
