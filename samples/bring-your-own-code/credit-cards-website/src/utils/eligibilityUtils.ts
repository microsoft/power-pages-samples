
interface EligibilityInput {
  income: string;
  creditScore: string;
}

export const checkEligibility = (input: EligibilityInput): string => {
  const { income, creditScore } = input;

  const numericIncome = parseFloat(income);
  const numericCreditScore = parseInt(creditScore, 10);

  if (isNaN(numericIncome) || isNaN(numericCreditScore)) {
    return 'Invalid input. Please enter valid numbers for income and credit score.';
  }

  if (numericIncome >= 50000 && numericCreditScore >= 750) {
    return 'You are eligible for the Travel Rewards Credit Card.';
  } else if (numericIncome >= 30000 && numericCreditScore >= 700) {
    return 'You are eligible for the Cashback Debit Card.';
  } else {
    return 'Unfortunately, you do not meet the eligibility requirements for any card.';
  }
};