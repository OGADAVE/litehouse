// =============================================================
// LITE HOUSE — Team Leader Milestone Reward Engine
//
// Milestones (one-time each, Level 1 referrals only):
//   20  active direct referrals → $50
//   50  active direct referrals → $100
//   100 active direct referrals → $250
//   200 active direct referrals → $500
//   500 active direct referrals → $1,500
//
// "Active" = referral has tradingActive: true
// Triggered every time any user activates a mining plan.
// Depends on: firebase-config.js (db, firebase)
// =============================================================

var MILESTONES = [
  { key: "milestone20Claimed",  threshold: 20,  bonus: 50,   label: "Team Leader Bonus — 20 active members"       },
  { key: "milestone50Claimed",  threshold: 50,  bonus: 100,  label: "Senior Leader Bonus — 50 active members"     },
  { key: "milestone100Claimed", threshold: 100, bonus: 250,  label: "Top Leader Bonus — 100 active members"       },
  { key: "milestone200Claimed", threshold: 200, bonus: 500,  label: "Elite Leader Bonus — 200 active members"     },
  { key: "milestone500Claimed", threshold: 500, bonus: 1500, label: "Legendary Leader Bonus — 500 active members" }
];

function checkMilestones(referrerUid) {
  if (!referrerUid) return Promise.resolve(null);

  return db.collection("users").doc(referrerUid).get()
    .then(function (referrerDoc) {
      if (!referrerDoc.exists) return null;
      var referrer = referrerDoc.data();

      return db.collection("users")
        .where("referredBy", "==", referrerUid)
        .where("tradingActive", "==", true)
        .get()
        .then(function (activeSnap) {
          var activeCount       = activeSnap.size;
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

          var batch      = db.batch();
          var totalBonus = 0;
          var updates    = {};
          var earned     = [];

          pendingMilestones.forEach(function (m) {
            totalBonus     += m.bonus;
            updates[m.key]  = true;
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
          batch.update(db.collection("users").doc(referrerUid), updates);

          return batch.commit().then(function () {
            console.log("Milestone bonus credited: $" + totalBonus + " to " + referrerUid);
            return { bonusEarned: totalBonus, activeCount: activeCount, milestones: earned };
          });
        });
    })
    .catch(function (err) {
      console.error("Milestone check error (non-critical):", err.message);
      return null;
    });
}

// =============================================================
// getMilestoneProgress — used by referral.html progress cards
// Returns live active count + status of all 5 milestones
// =============================================================
function getMilestoneProgress(uid, userData) {
  return db.collection("users")
    .where("referredBy", "==", uid)
    .where("tradingActive", "==", true)
    .get()
    .then(function (snap) {
      var activeCount = snap.size;

      function milestoneData(key, threshold, bonus) {
        var claimed   = userData[key] === true;
        var progress  = Math.min(100, (activeCount / threshold) * 100).toFixed(0);
        var remaining = Math.max(0, threshold - activeCount);
        return { claimed: claimed, progress: progress, remaining: remaining, threshold: threshold, bonus: bonus };
      }

      return {
        activeCount:   activeCount,
        milestone20:   milestoneData("milestone20Claimed",  20,  50),
        milestone50:   milestoneData("milestone50Claimed",  50,  100),
        milestone100:  milestoneData("milestone100Claimed", 100, 250),
        milestone200:  milestoneData("milestone200Claimed", 200, 500),
        milestone500:  milestoneData("milestone500Claimed", 500, 1500)
      };
    });
}