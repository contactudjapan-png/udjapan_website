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
const getMusicTaskNames = () => getSetting('music_task_names');
const setMusicTaskNames = (v) => setSetting('music_task_names', v);
const getCompetitionTaskNames = () => getSetting('competition_task_names');
const setCompetitionTaskNames = (v) => setSetting('competition_task_names', v);
const getAnchorTaskNames = () => getSetting('anchor_task_names');
const setAnchorTaskNames = (v) => setSetting('anchor_task_names', v);
const getPerformerTaskNames = () => getSetting('performer_task_names');
const setPerformerTaskNames = (v) => setSetting('performer_task_names', v);
const getControlRoomTaskNames = () => getSetting('control_room_task_names');
const setControlRoomTaskNames = (v) => setSetting('control_room_task_names', v);
const getStallObsTypes = () => getSetting('stall_obs_types');
const setStallObsTypes = (v) => setSetting('stall_obs_types', v);
const getExpenseCategories = () => getSetting('expense_categories');
const setExpenseCategories = (v) => setSetting('expense_categories', v);
const getIncomeCategories = () => getSetting('income_categories');
const setIncomeCategories = (v) => setSetting('income_categories', v);

// Combined list for dropdown (all roles)
async function getAllTaskGroups() {
  const [stall, reg, qr, music, competition, anchor, performer, controlRoom] = await Promise.all([getStallTaskNames(), getRegTaskNames(), getQRTaskNames(), getMusicTaskNames(), getCompetitionTaskNames(), getAnchorTaskNames(), getPerformerTaskNames(), getControlRoomTaskNames()]);
  const toList = s => (s || '').split('\n').map(t => t.trim()).filter(Boolean);
  return { stall: toList(stall), reg: toList(reg), qr: toList(qr), music: toList(music), competition: toList(competition), anchor: toList(anchor), performer: toList(performer), controlRoom: toList(controlRoom) };
}

module.exports = {
  getStallTaskNames, setStallTaskNames,
  getRegTaskNames, setRegTaskNames,
  getQRTaskNames, setQRTaskNames,
  getMusicTaskNames, setMusicTaskNames,
  getCompetitionTaskNames, setCompetitionTaskNames,
  getAnchorTaskNames, setAnchorTaskNames,
  getPerformerTaskNames, setPerformerTaskNames,
  getControlRoomTaskNames, setControlRoomTaskNames,
  getStallObsTypes, setStallObsTypes,
  getExpenseCategories, setExpenseCategories,
  getIncomeCategories, setIncomeCategories,
  getAllTaskGroups,
};
