const { econData } = require('../../economy/econStore');
const { addToTreasury } = require('../../economy/econStore');

const LOAN_MAX        = 2_500;
const LOAN_FEE        = 100;
const LOAN_OWED       = LOAN_MAX + LOAN_FEE;
const DEDUCT_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

// Called by bankChargeScheduler — auto-deducts overdue loans from bank/wallet
function applyLoanDeduction(d) {
    const loan = d.loan;
    if (!loan || loan.owed <= 0) return false;
    if (Date.now() - loan.takenAt < DEDUCT_AFTER_MS) return false;

    let remaining = loan.owed;

    // Deduct from bank first
    if (d.banks?.garaad > 0) {
        const take      = Math.min(remaining, d.banks.garaad);
        d.banks.garaad -= take;
        remaining      -= take;
    }

    // Then from wallet
    if (remaining > 0 && (d.btc || 0) > 0) {
        const take = Math.min(remaining, d.btc || 0);
        d.btc      = (d.btc || 0) - take;
        remaining -= take;
    }

    const fullyPaid = remaining === 0;
    d.loan = fullyPaid ? null : { ...loan, owed: remaining };
    if (fullyPaid) addToTreasury(LOAN_FEE);
    return true;
}

module.exports.applyLoanDeduction = applyLoanDeduction;
module.exports.LOAN_AMOUNT        = LOAN_MAX;
module.exports.LOAN_OWED          = LOAN_OWED;
