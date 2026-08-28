import { describe, it, expect } from "vitest";
import { numberToWordsNpr } from "./nepali-number-words";

describe("numberToWordsNpr", () => {
  it("converts single digits and simple numbers", () => {
    expect(numberToWordsNpr(0)).toBe("Nepalese Rupees Zero Only");
    expect(numberToWordsNpr(5)).toBe("Nepalese Rupees Five Only");
    expect(numberToWordsNpr(15)).toBe("Nepalese Rupees Fifteen Only");
    expect(numberToWordsNpr(45)).toBe("Nepalese Rupees Forty-Five Only");
    expect(numberToWordsNpr(100)).toBe("Nepalese Rupees One Hundred Only");
    expect(numberToWordsNpr(350)).toBe("Nepalese Rupees Three Hundred Fifty Only");
  });

  it("converts thousands, lakhs, and crores accurately", () => {
    expect(numberToWordsNpr(1000)).toBe("Nepalese Rupees One Thousand Only");
    expect(numberToWordsNpr(25000)).toBe("Nepalese Rupees Twenty-Five Thousand Only");
    expect(numberToWordsNpr(100000)).toBe("Nepalese Rupees One Lakh Only");
    expect(numberToWordsNpr(145000)).toBe("Nepalese Rupees One Lakh Forty-Five Thousand Only");
    expect(numberToWordsNpr(1250350)).toBe("Nepalese Rupees Twelve Lakh Fifty Thousand Three Hundred Fifty Only");
    expect(numberToWordsNpr(10000000)).toBe("Nepalese Rupees One Crore Only");
    expect(numberToWordsNpr(25000000)).toBe("Nepalese Rupees Two Crore Fifty Lakh Only");
  });

  it("handles decimal paisa accurately", () => {
    expect(numberToWordsNpr(145000.50)).toBe("Nepalese Rupees One Lakh Forty-Five Thousand and Fifty Paisa Only");
    expect(numberToWordsNpr(99.99)).toBe("Nepalese Rupees Ninety-Nine and Ninety-Nine Paisa Only");
    expect(numberToWordsNpr(1200.05)).toBe("Nepalese Rupees One Thousand Two Hundred and Five Paisa Only");
  });

  it("handles string inputs and edge cases", () => {
    expect(numberToWordsNpr("45000")).toBe("Nepalese Rupees Forty-Five Thousand Only");
    expect(numberToWordsNpr("invalid")).toBe("Nepalese Rupees Zero Only");
    expect(numberToWordsNpr(-50)).toBe("Nepalese Rupees Zero Only");
  });
});
