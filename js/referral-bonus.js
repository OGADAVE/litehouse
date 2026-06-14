// =============================================================
// LITE HOUSE - Referral Bonus Engine (Instant Commission)
//
// NEW LOGIC:
//   - Deposits trigger NO commission
//   - Activating a PAID plan (basic, executive, premium, elite,
//     prestige — NOT free) triggers an INSTANT 10% commission
//     of the activated plan's cost, paid to the referrer once.
//
// Formula:
//   Referral Bonus = Activated Plan Cost × 10%
//
// The bonus is credited directly to the referrer's wallet
// balance and can be withdrawn, used to activate a plan, or
// used for any wallet transaction.
//
// Depends on: firebase-config.js (db, firebase)
// =============================================================

var REFERRAL_COMMISSION_RATE = 0.10; // 10%

/**
 * payInstantReferralCommission
 *
 * Call this immediately after a user successfully activates a
 * PAID plan (i.e. planKey !== "free").
 *
 * @param {string} referrerUid - the uid of the user who referred (currentData.referredBy)
 * @param {number} planCost    - the cost of the plan just activated (e.g. 100 for Premium)
 * @param {string} planKey     - the plan key activated (e.g. "premium") — used for logging
 * @param {string} fromUid     - the uid of the user who activated the plan
 * @returns {Promise<{paid:boolean, amount:number}|null>}
 */
function payInstantReferralCommission(referrerUid, planCost, planKey, fromUid) {
  // No referrer, or free plan (no commission on free plan) — skip silently
  if (!referrerUid || planKey === "free" || !planCost || planCost <= 0) {
    return Promise.resolve(null);
  }

  var commission = parseFloat((planCost * REFERRAL_COMMISSION_RATE).toFixed(4));

  var batch  = db.batch();
  var refRef = db.collection("users").doc(referrerUid);

  // Credit referrer's wallet — usable for withdrawal, plan activation, anything
  batch.update(refRef, {
    walletBalance:    firebase.firestore.FieldValue.increment(commission),
    referralEarnings: firebase.firestore.FieldValue.increment(commission)
  });

  // Log the transaction
  var txRef = db.collection("transactions").doc();
  batch.set(txRef, {
    userId:    referrerUid,
    type:      "referral_bonus",
    amount:    commission,
    fromUser:  fromUid,
    plan:      planKey,
    note:      "Referral commission (10% of $" + planCost.toFixed(2) + " " + capitalize(planKey) + " plan activation)",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return batch.commit()
    .then(function () {
      console.log("Instant referral commission paid:", commission, "to", referrerUid);
      return { paid: true, amount: commission };
    })
    .catch(function (err) {
      // Non-blocking — a referral payout failure must never break plan activation
      console.error("Referral commission error (non-critical):", err.message);
      return null;
    });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}