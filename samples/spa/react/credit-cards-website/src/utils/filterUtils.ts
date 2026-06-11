export function sortCardsByCategory(cards: any[], category: string): any[] {
  return cards.filter((card) => card.category.includes(category));
}

export function filterCardsByFeature(cards: any[], feature: string): any[] {
  return cards.filter((card) =>
    card.features.some((cardFeature) => cardFeature.includes(feature))
  );
}

export function getCardById(cards: any[], id: string): any | null {
  const card = cards.find((card) => card.id === id);
  return card ? card : null;
}

export function filterCardsByType(cards: any[], type: string): any[] {
  return cards.filter((card) => card.type === type);
}

export function searchCards(cards: any[], query: string): any[] {
  const lowerQuery = query.toLowerCase();
  return cards.filter(
    (card) =>
      card.name.toLowerCase().includes(lowerQuery) ||
      card.features.some((feature) => feature.toLowerCase().includes(lowerQuery)) ||
      card.category.some((category) => category.toLowerCase().includes(lowerQuery))
  );
}

export function validateFinancialData(
  annualIncome: number,
  creditScore: number
): boolean {
  return annualIncome > 0 && creditScore >= 300 && creditScore <= 850;
}

export function validateAddressFields(
  address: string,
  city: string,
  zipCode: string
): boolean {
  if (!address.trim() || !city.trim() || zipCode.trim().length < 5) {
    return false;
  }
  return true;
}