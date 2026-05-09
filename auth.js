document.addEventListener("DOMContentLoaded", function() {
  const loggedIn = JSON.parse(localStorage.getItem('helia_logged_in') || 'null');
  const profileBtn = document.getElementById('profileBtn') || document.getElementById('profileIcon');
  
  if (!profileBtn) return;

  if (loggedIn) {
    profileBtn.title = `Profil - ${loggedIn.name}`;
    profileBtn.href = 'profil.html';
    profileBtn.style.position = 'relative';

    const badge = document.createElement('span');
    badge.textContent = loggedIn.name.split(' ')[0];
    badge.style.cssText = `
      position:absolute; top:-9px; left:50%;
      transform:translateX(-50%);
      background:#1a1a1a; color:#fff;
      font-size:8px; padding:1px 6px;
      border-radius:8px; white-space:nowrap;
      letter-spacing:.5px; pointer-events:none;
      font-family:inherit;
    `;
    
    // Jangan tambahkan badge lagi kalau sudah ada
    if (!profileBtn.querySelector('span')) {
        profileBtn.appendChild(badge);
    }
  } else {
    profileBtn.href = 'login.html';
  }
});
