async function loadSteamPrice(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&filters=price_overview`;

  const response = await fetch(url);
  const data = await response.json();

  const appData = data[String(appId)];

  if (!appData || !appData.success || !appData.data || !appData.data.price_overview) {
    return "Price unavailable";
  }

  const price = appData.data.price_overview;

  const finalPrice = (price.final / 100).toFixed(2);
  const initialPrice = (price.initial / 100).toFixed(2);
  const discount = price.discount_percent;
  const currency = price.currency;

  if (discount > 0) {
    return `${currency} $${finalPrice} (${discount}% off; normally $${initialPrice})`;
  }

  return `${currency} $${finalPrice}`;
}

async function updateAllSteamPrices() {
  const gameCards = document.querySelectorAll(".game-card");

  for (const card of gameCards) {
    const appId = card.dataset.steamAppid;
    const priceElement = card.querySelector(".steam-price");

    try {
      const priceText = await loadSteamPrice(appId);
      priceElement.textContent = priceText;
    } catch (error) {
      priceElement.textContent = "Price unavailable";
      console.error(`Could not load Steam price for app ${appId}:`, error);
    }
  }
}

updateAllSteamPrices();