// =============================================================
// LITE HOUSE - Team Leader Milestone Reward Engine
//
// Milestones (one-time each, Level 1 referrals only):
//   20 active direct referrals → $50 bonus
//   50 active direct referrals → $100 bonus
//
// "Active" = referral has tradingActive: true
// Triggered every time any user activates a mining plan.
// =============================================================

var MILESTONES = [
  { key: "milestone20Claimed", threshold: 20, bonus: 50,  label: "Team Leader Bonus — 20 active members" },
  { key: "milestone50Claimed", threshold: 50, bonus: 100, label: "Senior Leader Bonus — 50 active members" }
];

function checkMilestones(referrerUid) {
  if (!referrerUid) return Promise.resolve(null);

  // Step 1: get referrer's current data
  return db.collection("users").doc(referrerUid).get()
    .then(function (referrerDoc) {
      if (!referrerDoc.exists) return null;
      var referrer = referrerDoc.data();

      // Step 2: count active direct referrals
      return db.collection("users")
        .where("referredBy", "==", referrerUid)
        .where("tradingActive", "==", true)
        .get()
        .then(function (activeSnap) {
          var activeCount = activeSnap.size;
          var pendingMilestones = [];

          MILESTONES.forEach(function (m) {
            var alreadyClaimed = referrer[m.key] === true;
            if (activeCount >= m.threshold && !alreadyClaimed) {
              pendingMilestones.push(m);
            }
          });

          if (pendingMilestones.length === 0) {
            return { bonusEarned: 0, activeCount: activeCount, milestones: [] };
          }

          // Step 3: batch write all earned milestones
          var batch      = db.batch();
          var totalBonus = 0;
          var updates    = {};
          var earned     = [];

          pendingMilestones.forEach(function (m) {
            totalBonus      += m.bonus;
            updates[m.key]   = true;
            earned.push(m);

            var txRef = db.collection("transactions").doc();
            batch.set(txRef, {
              userId:    referrerUid,
              type:      "team_bonus",
              amount:    m.bonus,
              note:      m.label,
              milestone: m.key,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });

          updates.walletBalance = firebase.firestore.FieldValue.increment(totalBonus);

          var userRef = db.collection("users").doc(referrerUid);
          batch.update(userRef, updates);

          return batch.commit().then(function () {
            console.log("Milestone bonus credited:", totalBonus, "to", referrerUid);
            return {
              bonusEarned: totalBonus,
              activeCount: activeCount,
              milestones:  earned
            };
          });
        });
    })
    .catch(function (err) {
      // Non-blocking — milestone check failing should never break the plan activation
      console.error("Milestone check error (non-critical):", err.message);
      return null;
    });
}

// =============================================================
// getMilestoneProgress — used by referral.html to show progress
// Returns live active count + status of each milestone
// =============================================================
function getMilestoneProgress(uid, userData) {
  return db.collection("users")
    .where("referredBy", "==", uid)
    .where("tradingActive", "==", true)
    .get()
    .then(function (snap) {
      var activeCount = snap.size;
      return {
        activeCount: activeCount,
        milestone20: {
          threshold: 20,
          bonus:     50,
          claimed:   userData.milestone20Claimed === true,
          progress:  Math.min(100, (activeCount / 20) * 100).toFixed(0),
          remaining: Math.max(0, 20 - activeCount)
        },
        milestone50: {
          threshold: 50,
          bonus:     100,
          claimed:   userData.milestone50Claimed === true,
          progress:  Math.min(100, (activeCount / 50) * 100).toFixed(0),
          remaining: Math.max(0, 50 - activeCount)
        }
      };
    });
}
