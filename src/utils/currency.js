export const formatKES = (value, { maximumFractionDigits = 2 } = {}) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 'KES 0.00';
  try {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits,
    }).format(number);
  } catch (e) {
    return `KES ${number.toFixed(maximumFractionDigits)}`;
  }
};

