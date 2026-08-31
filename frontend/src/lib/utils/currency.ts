export function formatCurrency(amount: number, currencyCode: string = 'INR', useCodeOnly: boolean = false): string {
  const isINR = currencyCode.toUpperCase() === 'INR';
  const minDigits = isINR ? 0 : 2;
  const maxDigits = isINR ? 0 : 2;

  if (useCodeOnly) {
    return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })} ${currencyCode.toUpperCase()}`;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    }).format(amount);
  } catch (err) {
    return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })} ${currencyCode}`;
  }
}
