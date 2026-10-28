import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const state = {
  user: null,
  games: [],
  communities: []
};

const authPanel = document.getElementById("authPanel");
const appContent = document.getElementById("appContent");
const authButton = document.getElementById("authButton");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleLoginBtn = document.getElementById("googleLogin");
const gamesGrid = document.getElementById("gamesGrid");
const communitiesGrid = document.getElementById("communitiesGrid");
const userProfile = document.getElementById("userProfile");
const addGameBtn = document.getElementById("addGameBtn");
const gameModal = document.getElementById("gameModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const gameForm = document.getElementById("gameForm");
const gameSelect = document.getElementById("gameSelect");
const statusSelect = document.getElementById("statusSelect");
const ratingInput = document.getElementById("ratingInput");
const reviewInput = document.getElementById("reviewInput");
const likedInput = document.getElementById("likedInput");

let authMode = "login";

async function init() {
  await loadGames();
  await loadCommunities();
  await getCurrentUser();

  authButton.addEventListener("click", toggleAuthPanel);
  authForm.addEventListener("submit", handleAuthSubmit);
  googleLoginBtn.addEventListener("click", loginWithGoogle);

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      authMode = button.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn === button));
    });
  });

  document.getElementById("loadGamesBtn").addEventListener("click", loadGames);
  addGameBtn.addEventListener("click", openAddGameModal);
  closeModalBtn.addEventListener("click", closeAddGameModal);
  gameForm.addEventListener("submit", handleAddGameForm);

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#discover") {
      document.getElementById("discover").scrollIntoView({ behavior: "smooth" });
    }
  });
}

function toggleAuthPanel() {
  authPanel.classList.toggle("hidden");
  appContent.classList.toggle("hidden");
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Email ve şifre gerekli.", "error");
    return;
  }

  if (authMode === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      showMessage(error.message, "error");
      return;
    }

    showMessage("Kayıt başarılı. Email doğrulamanızı yapın.", "success");
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage(error.message, "error");
      return;
    }

    await getCurrentUser();
    authPanel.classList.add("hidden");
    appContent.classList.remove("hidden");
  }
}

async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    showMessage(error.message, "error");
  }
}

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    authPanel.classList.remove("hidden");
    appContent.classList.add("hidden");
    authButton.textContent = "Giriş";
    return;
  }

  state.user = user;
  authButton.textContent = "Çıkış";
  authButton.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  authPanel.classList.add("hidden");
  appContent.classList.remove("hidden");

  await loadUserProfile(user.id);
}

async function loadUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    userProfile.innerHTML = `<div class="message error">${error.message}</div>`;
    return;
  }

  const displayName = data.display_name || data.username || "User";

  userProfile.innerHTML = `
    <div class="profile-header">
      <div class="avatar">${displayName.charAt(0).toUpperCase()}</div>
      <div>
        <h3>${displayName}</h3>
        <div>@${data.username}</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-box">
        <span>Oynanan</span>
        <strong>0</strong>
      </div>
      <div class="stat-box">
        <span>Takip</span>
        <strong>0</strong>
      </div>
      <div class="stat-box">
        <span>Topluluk</span>
        <strong>0</strong>
      </div>
    </div>
  `;
}

async function loadGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .limit(12);

  if (error) {
    gamesGrid.innerHTML = `<div class="message error">${error.message}</div>`;
    return;
  }

  state.games = data || [];
  renderGames();
  populateGameSelect();
}

function renderGames() {
  if (!state.games.length) {
    gamesGrid.innerHTML = "Oyun bulunamadı.";
    return;
  }

  gamesGrid.innerHTML = state.games.map((game) => {
    const rating = game.rating_avg ? Number(game.rating_avg).toFixed(1) : "0.0";
    const genres = Array.isArray(game.genres) ? game.genres.slice(0, 2).join(" • ") : "Aksiyon";

    return `
      <article class="game-card">
        <div class="game-cover">${(game.name || "G").slice(0, 2).toUpperCase()}</div>
        <h3>${game.name}</h3>
        <div class="game-meta">${game.release_date || "2024"} • ${genres}</div>
        <div class="game-meta">Puan: ${rating}</div>
        <div class="game-meta">${game.rating_count || 0} oy</div>
      </article>
    `;
  }).join("");
}

async function loadCommunities() {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .limit(6);

  if (error) {
    communitiesGrid.innerHTML = `<div class="message error">${error.message}</div>`;
    return;
  }

  state.communities = data || [];
  renderCommunities();
}

function renderCommunities() {
  communitiesGrid.innerHTML = state.communities.map((community) => `
    <article class="community-card">
      <h3>${community.name}</h3>
      <p>${community.description || "Topluluk açıklaması yok."}</p>
      <div class="game-meta">${community.member_count || 0} üye</div>
    </article>
  `).join("");
}

function populateGameSelect() {
  gameSelect.innerHTML = state.games.map((game) => `
    <option value="${game.id}">${game.name}</option>
  `).join("");
}

function openAddGameModal() {
  if (!state.user) {
    showMessage("Önce giriş yapmalısın.", "error");
    return;
  }

  if (state.games.length) {
    gameSelect.value = String(state.games[0].id);
  }

  gameModal.classList.remove("hidden");
}

function closeAddGameModal() {
  gameModal.classList.add("hidden");
  gameForm.reset();
}

async function handleAddGameForm(event) {
  event.preventDefault();

  if (!state.user) {
    showMessage("Yetkisiz işlem.", "error");
    return;
  }

  const gameId = Number(gameSelect.value);
  const rating = Number(ratingInput.value);
  const review = reviewInput.value.trim();
  const liked = likedInput.checked;
  const status = statusSelect.value;

  if (!gameId || !Number.isFinite(rating)) {
    showMessage("Lütfen oyun ve puan seçin.", "error");
    return;
  }

  const { error } = await supabase.from("game_entries").insert({
    user_id: state.user.id,
    game_id: gameId,
    status,
    rating,
    review: review || null,
    liked,
    contains_spoilers: false
  });

  if (error) {
    showMessage("Kayıt eklenemedi: " + error.message, "error");
    return;
  }

  showMessage("Oyun başarıyla eklendi!", "success");
  closeAddGameModal();
  await loadGames();
}

function showMessage(message, type) {
  const existing = document.querySelector(".message");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = `message ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
}

init();