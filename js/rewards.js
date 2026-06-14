// =============================================================
// LITE HOUSE - Daily Mining Reward Engine
//
// Distributes daily mining rewards based on the user's active plan.
// Referral commissions are NOT handled here anymore.
// (Referral commission is now a one-time 10% of plan cost,
//  paid instantly at plan activation — see mining.html)
//
// Depends on: firebase-config.js (for PLANS, db, auth)
// =============================================================

function checkAndDistributeRewards(uid, userData) {
  if (!userData.tradingActive || !userData.activePlan) {
    return Promise.resolve(null);
  }

  var plan = PLANS[userData.activePlan];
  if (!plan) return Promise.resolve(null);

  var now = Date.now();

  var planEndDate = userData.planEndDate
    ? (userData.planEndDate.toDate ? userData.planEndDate.toDate().getTime() : new Date(userData.planEndDate).getTime())
    : now;

  var lastRewardTime = userData.lastRewardTime
    ? (userData.lastRewardTime.toDate ? userData.lastRewardTime.toDate().getTime() : now)
    : now;

  // Plan expired
  if (now > planEndDate) {
    return db.collection("users").doc(uid).update({
      tradingActive: false,
      activePlan:    null
    }).then(function () {
      return { expired: true };
    });
  }

  var hoursSinceLast = (now - lastRewardTime) / (1000 * 60 * 60);
  if (hoursSinceLast < 24) {
    return Promise.resolve({ hoursRemaining: 24 - hoursSinceLast });
  }

  // Calculate daily reward — total ROI spread evenly across the plan duration
  var totalROI    = (plan.cost * plan.roiPercent) / 100;
  var dailyReward = parseFloat((totalROI / plan.durationDays).toFixed(4));

  var batch   = db.batch();
  var userRef = db.collection("users").doc(uid);

  batch.update(userRef, {
    walletBalance:   firebase.firestore.FieldValue.increment(dailyReward),
    tradingEarnings: firebase.firestore.FieldValue.increment(dailyReward),
    lastRewardTime:  firebase.firestore.FieldValue.serverTimestamp()
  });

  var txRef = db.collection("transactions").doc();
  batch.set(txRef, {
    userId:    uid,
    type:      "reward",
    amount:    dailyReward,
    plan:      userData.activePlan,
    note:      "Daily mining reward — " + userData.activePlan + " plan",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return batch.commit().then(function () {
    return { rewarded: true, amount: dailyReward };
  }).catch(function (err) {
    console.error("Reward distribution error:", err);
    return null;
  });
}

function getTimeToNextReward(lastRewardTime) {
  if (!lastRewardTime) return "24h 00m";
  var last = lastRewardTime.toDate ? lastRewardTime.toDate().getTime() : Date.now();
  var next = last + 24 * 60 * 60 * 1000;
  var diff = next - Date.now();
  if (diff <= 0) return "Ready now";
  var h = Math.floor(diff / 3600000);
  var m = Math.floor((diff % 3600000) / 60000);
  return h + "h " + String(m).padStart(2, "0") + "m";
}

function getPlanProgress(tradingStartTime, durationDays) {
  durationDays = durationDays || 30;
  if (!tradingStartTime) return 0;
  var start   = tradingStartTime.toDate ? tradingStartTime.toDate().getTime() : Date.now();
  var total   = durationDays * 24 * 60 * 60 * 1000;
  var elapsed = Date.now() - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100)).toFixed(1);
}