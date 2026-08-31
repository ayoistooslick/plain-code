(() => {
  "use strict";

  const examples = [
    { category: "core", name: "Variables", description: "Declare and update values.", source: 'remember name as "Ada"\nremember count as 3\ncount becomes count + 1\nshow `Hello, ${name}!`' },
    { category: "core", name: "Conditions", description: "Use readable comparisons.", source: 'if score is at least 80 and name contains "A"\n    show "accepted"\notherwise\n    show "review"\ndone' },
    { category: "core", name: "Loops", description: "Iterate collections and ranges.", source: 'for each item in list with "one", "two"\n    show item\ndone\n\nfor index i from 0 to 2\n    show i\ndone' },
    { category: "core", name: "Functions", description: "Define functions with return values.", source: 'make add(a, b)\n    give a + b\ndone\n\nshow add(2, 3)' },
    { category: "data", name: "Records", description: "Define record kinds and values.", source: 'define a kind called "Player" with\n    name is ""\n    goals is 0\ndone\nremember player as create a Player with name "Ada" and goals 4' },
    { category: "data", name: "JSON", description: "Encode and decode structured data.", source: 'remember payload as {ok: true, count: 2}\nremember encoded as jsonEncode(payload)\nshow encoded' },
    { category: "data", name: "SQLite", description: "Run parameterized SQL blocks.", source: 'database "app.db" using "wasm"\nexecute\n    CREATE TABLE items (name TEXT)\ndone\nremember items as query\n    SELECT name FROM items\ndone' },
    { category: "web", name: "Web routes", description: "Create an HTTP app and JSON route.", source: 'web app\nroute get "/health"\n    reply json\n        ok is true\n    done\ndone\nstart 3000' },
    { category: "web", name: "HTTP client", description: "Call an HTTP endpoint.", source: 'remember response as get "https://example.com/data" timeout 5000\nshow response.status' },
    { category: "web", name: "Auth and sessions", description: "Protect routes and persist sessions.", source: 'web app\nenable sessions "session-secret"\nrequire api key from env("API_KEY")\nroute get "/me"\n    reply json\n        user is user of session of request\n    done\ndone' },
    { category: "runtime", name: "Async errors", description: "Await work and recover errors.", source: 'try\n    remember result as get "https://example.com" timeout 5000\nrecover as error\n    show message of error\nfinally\n    show "finished"' },
    { category: "runtime", name: "Concurrency", description: "Run promise groups with a timeout.", source: 'remember results as allOf(list with firstJob(), secondJob())\nremember quick as withTimeout(firstJob(), 1000)\nshow results' },
    { category: "runtime", name: "WebSockets", description: "Handle socket connections and messages.", source: 'websocket server on 8080\n    when socket connects\n        send socket "connected"\n    done\n    when socket sends message\n        broadcast message\n    done\ndone' },
    { category: "runtime", name: "Cache", description: "Store values with a TTL.", source: 'cache env("REDIS_URL")\ncacheSet("status", "ready", 60)\nremember status as cacheGet("status")' },
    { category: "integrations", name: "Telegram", description: "Respond to bot messages.", source: 'bot env("TELEGRAM_BOT_TOKEN")\nwhen someone sends "/start"\n    reply "Welcome"\ndone\nstart telegram bot' },
    { category: "integrations", name: "Groq AI", description: "Use provider-backed replies anywhere.", source: 'remember answer as chatWith("groq", "llama-3.3-70b-versatile", "Hello")\nshow answer' },
    { category: "integrations", name: "OCR uploads", description: "Read text from an uploaded image.", source: 'web app\naccept uploads limit "5 MB" allow list with "image/png" folder "uploads"\nroute post "/scan"\n    remember file as upload("document")\n    ocr path of file as text\n    reply text\ndone' },
    { category: "tooling", name: "Native tests", description: "Check behavior in PlainScript.", source: 'test "addition works"\n    check add(2, 3) equals 5\ndone' },
    { category: "tooling", name: "Modules", description: "Import a named export.", source: 'import { circleArea } from "./math.pln"\nshow circleArea(2)' }
  ];

  const grid = document.getElementById("lib-grid");
  const empty = document.getElementById("lib-empty");
  const search = document.getElementById("lib-search");
  const filters = document.getElementById("lib-filters");
  if (!grid || !empty || !search || !filters) return;

  const categories = ["all", ...new Set(examples.map((item) => item.category))];
  let activeCategory = "all";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lib-filter" + (category === "all" ? " is-active" : "");
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      filters.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      render();
    });
    filters.appendChild(button);
  });

  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = examples.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const haystack = `${item.name} ${item.description} ${item.source}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
    grid.replaceChildren();
    visible.forEach((item) => {
      const card = document.createElement("article");
      card.className = "library-card";
      card.innerHTML = `<div class="library-card-top"><span class="library-category">${item.category}</span><h3>${item.name}</h3><p>${item.description}</p></div><pre><code></code></pre>`;
      card.querySelector("code").textContent = item.source;
      grid.appendChild(card);
    });
    empty.hidden = visible.length !== 0;
  }

  search.addEventListener("input", render);
  render();
})();