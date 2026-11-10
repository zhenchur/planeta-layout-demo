(() => {
  const passwordDigest =
    "2d41c228f0ec3ccf3530a2f79b91caee42499fdd055ed06e9658a4271a0acce0";
  const storageKey = "planeta-mall-demo:unlocked";
  const root = document.documentElement;

  function hasAccess() {
    try {
      return sessionStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }

  if (hasAccess()) {
    root.classList.remove("demo-access-locked");
    return;
  }

  const gate = document.createElement("section");
  gate.className = "demo-access";
  gate.setAttribute("aria-labelledby", "demo-access-title");
  gate.innerHTML = `
    <form class="demo-access__form">
      <h1 id="demo-access-title">Вход в демо</h1>
      <label for="demo-access-password">Пароль</label>
      <input id="demo-access-password" type="password" autocomplete="current-password"
        autocapitalize="none" spellcheck="false" aria-describedby="demo-access-error" required />
      <p id="demo-access-error" class="demo-access__error" role="alert" hidden>Неверный пароль.</p>
      <button type="submit">Открыть демо</button>
    </form>
  `;

  const form = gate.querySelector("form");
  const input = gate.querySelector("input");
  const submit = gate.querySelector("button");
  const error = gate.querySelector(".demo-access__error");

  function revealDemo() {
    root.classList.remove("demo-access-locked");
    gate.remove();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const attempt = input.value;
    submit.disabled = true;
    let digest;
    try {
      const bytes = new TextEncoder().encode(attempt);
      const result = await crypto.subtle.digest("SHA-256", bytes);
      digest = Array.from(new Uint8Array(result), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
    } catch {
      error.textContent = "Проверка пароля доступна по HTTPS или на localhost.";
      error.hidden = false;
      return;
    } finally {
      submit.disabled = false;
    }

    if (input.value !== attempt) return;
    if (digest !== passwordDigest) {
      input.setAttribute("aria-invalid", "true");
      error.textContent = "Неверный пароль.";
      error.hidden = false;
      input.focus();
      input.select();
      return;
    }

    try {
      sessionStorage.setItem(storageKey, "true");
    } catch {
      // The current page can still open when storage is unavailable.
    }
    revealDemo();
  });

  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    error.hidden = true;
  });

  window.addEventListener("pageshow", () => {
    if (hasAccess()) revealDemo();
  });

  document.body.append(gate);
  input.focus({ preventScroll: true });
})();
