/**
 * Converts numbers into South Asian / Nepalese numbering words format (Crore, Lakh, Thousand, Hundred, Rupees & Paisa).
 * Compliant with Nepal IRD and commercial invoicing standards.
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(num: number): string {
  let str = "";
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  if (num >= 20) {
    const tens = TENS[Math.floor(num / 10)];
    const unit = num % 10 !== 0 ? "-" + ONES[num % 10] : "";
    str += tens + unit;
  } else if (num > 0) {
    str += ONES[num];
  }
  return str.trim();
}

/**
 * Converts a positive integer to Nepalese numbering words.
 * System: Crore (10,000,000) -> Lakh (100,000) -> Thousand (1,000) -> Hundred (100)
 */
function convertIntegerToNepaliWords(num: number): string {
  if (num === 0) return "Zero";

  let result = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  if (crore > 0) {
    result += convertIntegerToNepaliWords(crore) + " Crore ";
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + " Thousand ";
  }
  if (remainder > 0) {
    result += convertBelowThousand(remainder);
  }

  return result.trim();
}

/**
 * Converts a currency amount (in NPR) to standard invoice words format.
 * E.g., 145000.50 -> "Nepalese Rupees One Lakh Forty-Five Thousand and Fifty Paisa Only"
 */
export function numberToWordsNpr(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) return "Nepalese Rupees Zero Only";

  const rounded = Math.round(num * 100) / 100;
  const integerPart = Math.floor(rounded);
  const paisaPart = Math.round((rounded - integerPart) * 100);

  const rupeesWord = convertIntegerToNepaliWords(integerPart);

  if (paisaPart > 0) {
    const paisaWord = convertBelowThousand(paisaPart);
    if (integerPart === 0) {
      return `Nepalese Rupees ${paisaWord} Paisa Only`;
    }
    return `Nepalese Rupees ${rupeesWord} and ${paisaWord} Paisa Only`;
  }

  return `Nepalese Rupees ${rupeesWord} Only`;
}
