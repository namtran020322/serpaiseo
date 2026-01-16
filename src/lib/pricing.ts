export interface PricingPackage {
  id: string;
  name: string;
  price: number; // VND
  credits: number;
  pricePerCredit: number;
  popular?: boolean;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 200000,
    credits: 10000,
    pricePerCredit: 20,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 500000,
    credits: 28000,
    pricePerCredit: 17.86,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2000000,
    credits: 135000,
    pricePerCredit: 14.81,
  },
];

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCredits(credits: number): string {
  return new Intl.NumberFormat('vi-VN').format(credits);
}

// Calculate credits needed for a check
// Top 50 = 5 credits, Top 100 = 10 credits
export function calculateCreditsNeeded(topResults: number, keywordCount: number): number {
  const creditsPerKeyword = Math.ceil(topResults / 10);
  return creditsPerKeyword * keywordCount;
}

export function getPackageById(id: string): PricingPackage | undefined {
  return PRICING_PACKAGES.find(pkg => pkg.id === id);
}
