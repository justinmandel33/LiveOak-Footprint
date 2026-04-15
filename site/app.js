const data = await fetch("./data/latest.json").then((response) => response.json());

const state = {
  activeFilter: "ALL",
};

const trackerName = document.querySelector("#tracker-name");
const trackerTagline = document.querySelector("#tracker-tagline");
const generatedDate = document.querySelector("#generated-date");
const summaryAddresses = document.querySelector("#summary-addresses");
const summaryStates = document.querySelector("#summary-states");
const blockerGrid = document.querySelector("#blocker-grid");
const stateFilter = document.querySelector("#state-filter");
const addressGrid = document.querySelector("#address-grid");

trackerName.textContent = data.trackerName;
trackerTagline.textContent = data.tagline;
generatedDate.textContent = data.generatedDateLabel;
summaryAddresses.textContent = String(data.summary.addressCount);
summaryStates.textContent = String(data.summary.stateCount);

function renderBlockers() {
  const template = document.querySelector("#blocker-template");
  blockerGrid.innerHTML = "";

  data.globalBlockers.forEach((blocker) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".blocker-card");
    card.dataset.status = blocker.status;
    fragment.querySelector("h3").textContent = blocker.title;
    fragment.querySelector("p").textContent = blocker.detail;
    blockerGrid.appendChild(fragment);
  });
}

function renderFilters() {
  const states = ["ALL", ...new Set(data.addresses.map((address) => address.state))];
  stateFilter.innerHTML = "";

  states.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item === "ALL" ? "All states" : item;
    button.classList.toggle("is-active", state.activeFilter === item);
    button.addEventListener("click", () => {
      state.activeFilter = item;
      renderFilters();
      renderAddresses();
    });
    stateFilter.appendChild(button);
  });
}

function providerNoteText(provider) {
  return provider.notes[0] ?? "";
}

function refreshLabel(provider) {
  return provider.refreshStatus === "live_public_page_match" ? "Live page match" : "Seeded fallback";
}

function renderAddresses() {
  const template = document.querySelector("#address-template");
  const providerTemplate = document.querySelector("#provider-template");
  addressGrid.innerHTML = "";

  const addresses = data.addresses.filter((address) => {
    return state.activeFilter === "ALL" || address.state === state.activeFilter;
  });

  addresses.forEach((address, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".address-card");
    card.style.animationDelay = `${index * 70}ms`;

    fragment.querySelector(".address-region").textContent = address.region;
    fragment.querySelector(".address-title").textContent = address.street;
    fragment.querySelector(".address-subtitle").textContent = `${address.city}, ${address.state} ${address.zip}`;
    fragment.querySelector(".status-badge").textContent = "Provisional exact-address match";
    fragment.querySelector(".address-note").textContent = address.footprintNote;

    const marketSourceLink = fragment.querySelector(".market-source a");
    marketSourceLink.href = address.liveoakMarketSource.url;
    marketSourceLink.textContent = address.liveoakMarketSource.label;

    const providerList = fragment.querySelector(".provider-list");

    address.providers.forEach((provider) => {
      const providerFragment = providerTemplate.content.cloneNode(true);
      providerFragment.querySelector(".provider-name").textContent = provider.name;
      providerFragment.querySelector(".provider-meta").textContent = `${provider.technology} • ${provider.confidence.replaceAll("_", " ")}`;
      providerFragment.querySelector(".provider-availability").textContent = provider.availabilityDetail;
      providerFragment.querySelector(".provider-source").innerHTML = `Pricing source: <a href="${provider.priceUrl}" target="_blank" rel="noreferrer">${provider.priceSourceLabel}</a>`;
      providerFragment.querySelector(".provider-note").textContent = providerNoteText(provider);

      const refreshPill = providerFragment.querySelector(".refresh-pill");
      refreshPill.textContent = refreshLabel(provider);
      refreshPill.dataset.status = provider.refreshStatus;

      const offers = providerFragment.querySelector(".offer-list");
      provider.offers.forEach((offer) => {
        const item = document.createElement("li");
        item.innerHTML = `<span class="offer-tier">${offer.tier}</span><span class="offer-price">${offer.price}</span>`;
        offers.appendChild(item);
      });

      providerList.appendChild(providerFragment);
    });

    addressGrid.appendChild(fragment);
  });
}

renderBlockers();
renderFilters();
renderAddresses();
