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

const getStallTaskNames = () => getSetting('stall_task_names');
const setStallTaskNames = (v) => setSetting('stall_task_names', v);
const getRegTaskNames = () => getSetting('reg_task_names');
const setRegTaskNames = (v) => setSetting('reg_task_names', v);
const getQRTaskNames = () => getSetting('qr_task_names');
const setQRTaskNames = (v) => setSetting('qr_task_names', v);
const getStallObsTypes = () => getSetting('stall_obs_types');
const setStallObsTypes = (v) => setSetting('stall_obs_types', v);

// Combined list for dropdown (all roles)
async function getAllTaskGroups() {
  const [stall, reg, qr] = await Promise.all([getStallTaskNames(), getRegTaskNames(), getQRTaskNames()]);
  const toList = s => (s || '').split('\n').map(t => t.trim()).filter(Boolean);
  return { stall: toList(stall), reg: toList(reg), qr: toList(qr) };
}

module.exports = {
  getStallTaskNames, setStallTaskNames,
  getRegTaskNames, setRegTaskNames,
  getQRTaskNames, setQRTaskNames,
  getStallObsTypes, setStallObsTypes,
  getAllTaskGroups,
};
