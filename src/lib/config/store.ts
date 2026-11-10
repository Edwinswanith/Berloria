/** Shop-wide selling rules. Amounts are in paise. */
export const STORE = {
  /** Orders at or above this subtotal ship free. */
  freeDeliveryFrom: 199_900,
  /** Used only if the store record has no delivery lane configured. */
  fallbackDeliveryFee: 7_900,
  /** Cash on delivery is offered up to this order total. */
  codLimit: 1_000_000,
} as const;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
] as const;
