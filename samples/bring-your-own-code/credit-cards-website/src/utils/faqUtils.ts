export function getFAQsByKeyword(faqs: any[], keyword: string): any[] {
  const lowercasedKeyword = keyword.toLowerCase();
  return faqs.filter(faq => 
    faq.question.toLowerCase().includes(lowercasedKeyword) || 
    faq.answer.toLowerCase().includes(lowercasedKeyword)
  );
}

export function findFAQById(faqs: any[], id: string): any | null {
  const faq = faqs.find(faq => faq.id === id);
  return faq ? faq : null;
}