function getTierForDate(date, event) {
  if (!date || !event) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  if (event.early_bird_deadline && d <= new Date(event.early_bird_deadline) && event.price_early_bird != null)
    return { tier: 'Early Bird', price: parseFloat(event.price_early_bird) };
  if (event.mid_deadline && d <= new Date(event.mid_deadline) && event.price_mid != null)
    return { tier: 'Standard', price: parseFloat(event.price_mid) };
  if (event.price_onspot != null)
    return { tier: 'On-spot', price: parseFloat(event.price_onspot) };
  return null;
}

function computeExpectedAmount(registration, event) {
  const adults = parseInt(registration.adults_count) || 0;
  if (adults === 0 || !event) return null;
  const tierInfo = getTierForDate(registration.created_at, event);
  if (!tierInfo) return null;
  const subtotal = adults * tierInfo.price;
  let discount = 0;
  const { group_min_size, group_discount } = event;
  if (group_min_size && group_discount && adults >= group_min_size) {
    discount = Math.floor(adults / group_min_size) * parseFloat(group_discount);
  }
  return { tier: tierInfo.tier, pricePerAdult: tierInfo.price, amount: Math.max(0, subtotal - discount) };
}

module.exports = { getTierForDate, computeExpectedAmount };
