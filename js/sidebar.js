// =============================================================
// LITE HOUSE - Sidebar Builder
// =============================================================

function buildSidebar(activePage) {
  var navItems = [
    { id: "dashboard",    icon: "🏠", label: "Dashboard",    href: "dashboard.html"    },
    { id: "trade",        icon: "📈", label: "AI Trading",   href: "trade.html"        },
    { id: "mining",       icon: "⛏️",  label: "Mining",       href: "mining.html"       },
    { id: "deposit",      icon: "💳", label: "Deposit",      href: "deposit.html"      },
    { id: "withdraw",     icon: "💸", label: "Withdraw",     href: "withdraw.html"     },
    { id: "transactions", icon: "📋", label: "Transactions", href: "transactions.html" },
    { id: "referral",     icon: "🔗", label: "Referral",     href: "referral.html"     },
    { id: "contact",      icon: "💬", label: "Support",      href: "contact.html"      }
  ];

  var navHTML = navItems.map(function (item) {
    var isActive = activePage === item.id;
    return '<a href="' + item.href + '" class="nav-link' + (isActive ? " active" : "") + '">' +
           '<span class="nav-icon">' + item.icon + '</span>' +
           '<span>' + item.label + '</span>' +
           '</a>';
  }).join("");

  var sidebarHTML = '' +
    '<div class="sidebar" id="sidebar">' +
      '<div class="sidebar-logo">' +
        '<img src="../assets/logo.png" alt="LITE HOUSE" class="sidebar-logo-img"/>' +
      '</div>' +
      '<div class="nav-section">' +
        '<div class="nav-section-label">Navigation</div>' +
        navHTML +
      '</div>' +
      '<div class="sidebar-footer">' +
        '<div class="user-chip">' +
          '<div class="user-avatar" id="sidebar-avatar">?</div>' +
          '<div class="user-info">' +
            '<div class="user-name" id="sidebar-username">Loading...</div>' +
            '<div class="user-role">Member</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-secondary w-full" onclick="doSignOut()" ' +
          'style="margin-top:10px;font-size:.82rem;padding:10px;border-radius:8px;">' +
          '🚪 &nbsp;Sign Out' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>';

  document.body.insertAdjacentHTML("afterbegin", sidebarHTML);

  // ── Inject floating WhatsApp button on all protected pages ──
  // ⚠ REPLACE: Change YOUR_WHATSAPP_NUMBER below (country code + number, no + or spaces)
  // Example for Nigeria: 2348012345678
  var WA_NUMBER  = "YOUR_WHATSAPP_NUMBER";
  var WA_MESSAGE = encodeURIComponent("Hello LITE HOUSE Support, I need help with...");
  var WA_URL     = "https://wa.me/" + WA_NUMBER + "?text=" + WA_MESSAGE;

  // Only inject if not already on contact page (it has its own)
  if (activePage !== "contact") {
    var floatBtn = document.createElement("a");
    floatBtn.href      = WA_URL;
    floatBtn.target    = "_blank";
    floatBtn.className = "wa-float-global";
    floatBtn.title     = "Chat with Support";
    floatBtn.innerHTML = "<span>💬</span><span class='wa-float-tip'>Support</span>";
    document.body.appendChild(floatBtn);
  }
}

function buildTopbar(title) {
  var topbarHTML = '' +
    '<div class="topbar">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<div class="hamburger" onclick="toggleSidebar()">' +
          '<span></span><span></span><span></span>' +
        '</div>' +
        '<div class="topbar-title">' + title + '</div>' +
      '</div>' +
      '<div class="topbar-actions">' +
        '<div id="topbar-balance" style="' +
          'font-family:var(--font-mono);font-size:.82rem;color:var(--gold);' +
          'background:rgba(240,192,64,0.1);border:1px solid rgba(240,192,64,0.2);' +
          'padding:5px 14px;border-radius:6px;white-space:nowrap;"></div>' +
      '</div>' +
    '</div>';

  var mainContent = document.querySelector(".main-content");
  if (mainContent) mainContent.insertAdjacentHTML("afterbegin", topbarHTML);
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
}
function populateSidebarUser(userData) {
  var nameEl    = document.getElementById("sidebar-username");
  var avatarEl  = document.getElementById("sidebar-avatar");
  var balanceEl = document.getElementById("topbar-balance");
  if (nameEl)    nameEl.textContent    = userData.username || "User";
  if (avatarEl)  avatarEl.textContent  = (userData.username || "U")[0].toUpperCase();
  if (balanceEl) balanceEl.textContent = "$" + formatCurrency(userData.walletBalance);
}