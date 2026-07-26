const db = require('../config/db');

async function getSetting(key) {
  const { data } = await db.from('app_settings').select('value').eq('key', key).single();
  return data ? data.value : '';
}

async function setSetting(key, value) {
  const { data: existing } = await db.from('app_settings').select('key').eq('key', key).single();
  if (existing) {
    await db.from('app_settings').update({ value }).eq('key', key);
  } else {
    await db.from('app_settings').insert({ key, value });
  }
}

const getVolTaskTypes = () => getSetting('vol_task_types');
const setVolTaskTypes = (v) => setSetting('vol_task_types', v);
const getStallObsTypes = () => getSetting('stall_obs_types');
const setStallObsTypes = (v) => setSetting('stall_obs_types', v);

module.exports = { getVolTaskTypes, setVolTaskTypes, getStallObsTypes, setStallObsTypes };
