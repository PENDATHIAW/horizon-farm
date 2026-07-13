import { toNumber } from '../utils/format';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundTo = (value, step = 5000) => Math.floor(toNumber(value) / step) * step;

export function recommendOwnerSalary({
  operatingResult = 0,
  cashAfterInvestments = 0,
  existingOwnerSalary = 0,
  existingOwnerWithdrawals = 0,
  reserveRate = 0.35,
  salaryRate = 0.25,
  maxSalary = 300000,
} = {}) {
  const result = toNumber(operatingResult);
  const cash = toNumber(cashAfterInvestments);
  const alreadySalary = toNumber(existingOwnerSalary);
  const withdrawals = toNumber(existingOwnerWithdrawals);
  const requiredReserve = Math.max(0, result * reserveRate);
  const cashAvailableAfterReserve = Math.max(0, cash - requiredReserve - withdrawals);
  const resultBasedSalary = result > 0 ? result * salaryRate : 0;
  const grossRecommendation = Math.min(resultBasedSalary, cashAvailableAfterReserve, maxSalary);
  const recommended = roundTo(clamp(grossRecommendation - alreadySalary, 0, maxSalary), 5000);
  const status = recommended <= 0
    ? 'reporter'
    : cashAvailableAfterReserve < resultBasedSalary
      ? 'prudence'
      : 'valider';
  const reason = status === 'reporter'
    ? 'Résultat ou trésorerie insuffisants après réserve.'
    : status === 'prudence'
      ? 'Salaire possible, mais limité par la trésorerie disponible après réserve.'
      : 'Salaire recommandé compatible avec le résultat et la trésorerie.';

  return {
    recommended,
    status,
    reason,
    salaryRate,
    reserveRate,
    requiredReserve,
    cashAvailableAfterReserve,
    resultBasedSalary,
    alreadySalary,
    withdrawals,
    maxSalary,
  };
}
