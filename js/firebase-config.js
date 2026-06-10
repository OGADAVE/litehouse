// =============================================================
// LITE HOUSE - Firebase Configuration
// Project: lite-house-b2139
// =============================================================

var firebaseConfig = {
  apiKey:            "AIzaSyAYpJh4hLwrXsFpKnnXi1e6wVstgitv5L0",
  authDomain:        "lite-house-b2139.firebaseapp.com",
  projectId:         "lite-house-b2139",
  storageBucket:     "lite-house-b2139.firebasestorage.app",
  messagingSenderId: "563490813811",
  appId:             "1:563490813811:web:1d3d83fb43db7be178f706"
};

firebase.initializeApp(firebaseConfig);

var auth = firebase.auth();
var db   = firebase.firestore();

// =============================================================
// PATH HELPER - works from both /index.html and /pages/*.html
// =============================================================
function basePath() {
  return window.location.pathname.includes("/pages/") ? "../" : "";
}

// =============================================================
// TOAST NOTIFICATIONS
// =============================================================
function showToast(message, type) {
  type = type || "info";
  var existing = document.querySelector(".lh-toast");
  if (existing) existing.remove();

  var icons = { success: "✓", error: "✕", info: "i" };
  var toast = document.createElement("div");
  toast.className = "lh-toast lh-toast--" + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || "i") + "</span>" +
    "<span>" + message + "</span>";
  document.body.appendChild(toast);

  requestAnimationFrame(function () {
    toast.classList.add("lh-toast--visible");
  });

  setTimeout(function () {
    toast.classList.remove("lh-toast--visible");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 3500);
}

// =============================================================
// BUTTON LOADING STATE
// =============================================================
function setLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
  } else {
    btn.innerHTML = text || btn.dataset.originalText || btn.textContent;
  }
}

// =============================================================
// FORMATTING HELPERS
// =============================================================
function formatCurrency(amount, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return parseFloat(amount || 0).toFixed(decimals);
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit"
  });
}

function generateReferralCode(username) {
  var prefix = (username || "USR").substring(0, 3).toUpperCase();
  var suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + suffix;
}

// =============================================================
// AUTH GUARD - for protected pages inside /pages/
// =============================================================
function requireAuth(callback) {
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = basePath() + "index.html";
      return;
    }
    if (!user.emailVerified) {
      window.location.href = basePath() + "pages/verify-email.html";
      return;
    }

    db.collection("users").doc(user.uid).get().then(function (doc) {

      // ── User doc exists — normal flow ──────────────────────
      if (doc.exists) {
        callback(user, doc.data());
        return;
      }

      // ── User doc missing (Firestore write failed at registration)
      // Auto-create it so we don't loop back to login ─────────
      console.warn("User doc missing — auto-creating for:", user.uid);
      var fallbackUsername = (user.email || "user").split("@")[0];
      var newUserData = {
        username:           fallbackUsername,
        email:              user.email || "",
        referralCode:       generateReferralCode(fallbackUsername),
        referredBy:         null,
        walletBalance:      5,
        tradingEarnings:    0,
        referralEarnings:   0,
        activePlan:         "free",
        tradingActive:      true,
        tradingStartTime:   firebase.firestore.FieldValue.serverTimestamp(),
        lastRewardTime:     firebase.firestore.FieldValue.serverTimestamp(),
        planEndDate:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        milestone20Claimed: false,
        milestone50Claimed: false,
        createdAt:          firebase.firestore.FieldValue.serverTimestamp()
      };

      db.collection("users").doc(user.uid).set(newUserData)
        .then(function () {
          console.log("User doc created successfully.");
          callback(user, newUserData);
        })
        .catch(function (createErr) {
          // Doc create failed — likely Firestore rules not published
          console.error("Cannot create user doc:", createErr.code, createErr.message);
          var msg = createErr.code === "permission-denied"
            ? "Firestore rules not published. Go to Firebase Console → Firestore → Rules → Publish."
            : "Database error: " + createErr.message;
          // Show error in page without redirecting (prevents loop)
          document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;' +
            'background:#080C10;color:#F0C040;font-family:monospace;text-align:center;padding:40px;">' +
            '<div><div style="font-size:2rem;margin-bottom:16px;">⚠</div>' +
            '<div style="font-size:1rem;color:#fff;margin-bottom:8px;">Setup Required</div>' +
            '<div style="font-size:.85rem;color:#8A95A8;max-width:400px;line-height:1.7;">' + msg + '</div>' +
            '<div style="margin-top:24px;"><a href="../index.html" ' +
            'style="color:#F0C040;text-decoration:underline;">Back to Login</a></div></div></div>';
        });

    }).catch(function (readErr) {
      // Firestore read itself failed
      console.error("requireAuth Firestore read error:", readErr.code, readErr.message);
      var msg = readErr.code === "permission-denied"
        ? "Firestore rules not published. Go to Firebase Console → Firestore → Rules → Publish."
        : "Database connection error: " + readErr.message;
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;' +
        'background:#080C10;color:#F0C040;font-family:monospace;text-align:center;padding:40px;">' +
        '<div><div style="font-size:2rem;margin-bottom:16px;">⚠</div>' +
        '<div style="font-size:1rem;color:#fff;margin-bottom:8px;">Setup Required</div>' +
        '<div style="font-size:.85rem;color:#8A95A8;max-width:400px;line-height:1.7;">' + msg + '</div>' +
        '<div style="margin-top:24px;"><a href="../index.html" ' +
        'style="color:#F0C040;text-decoration:underline;">Back to Login</a></div></div></div>';
    });
  });
}

// =============================================================
// ADMIN GUARD - for admin panel only
// =============================================================
function requireAdmin(callback) {
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = basePath() + "index.html";
      return;
    }
    db.collection("admins").doc(user.uid).get().then(function (snap) {
      if (!snap.exists) {
        window.location.href = basePath() + "pages/dashboard.html";
        return;
      }
      callback(user, snap.data());
    });
  });
}

// =============================================================
// SIGN OUT
// =============================================================
function doSignOut() {
  auth.signOut().then(function () {
    window.location.href = basePath() + "index.html";
  });
}

// =============================================================
// MINING PLANS - single source of truth across all pages
// =============================================================
var PLANS = {
  free:      { name: "Free",      cost: 5,   roiPercent: 100, durationDays: 30, withdrawEnabled: false },
  basic:     { name: "Basic",     cost: 20,  roiPercent: 150, durationDays: 30, withdrawEnabled: true  },
  executive: { name: "Executive", cost: 50,  roiPercent: 175, durationDays: 30, withdrawEnabled: true  },
  premium:   { name: "Premium",   cost: 100, roiPercent: 200, durationDays: 30, withdrawEnabled: true  },
  Elite:     { name: "Elite",     cost: 500, roiPercent: 250, durationDays: 30, withdrawEnabled: true  },
  Prestige:  { name: "Prestige",  cost: 1000,roiPercent: 300, durationDays: 30, withdrawEnabled: true  }
};

var DEFAULT_PLANS = PLANS;