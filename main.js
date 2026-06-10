'use strict';

// We suppose that `busydayActivities` object was loaded in config.js (see README)
const btnIdPrefix = 'busy-btn-';
const btnClassName = 'busyness-button';
const btnActiveClassName = 'active';

const timers = {};
const timerSums = {};
const timerButtons = {};
const timerInfos = {};
let timerTotal = null;

document.body.onload = init;

function init() {
  const container = document.getElementById('busyday');

  for (const name in busydayActivities) {
    timers[name] = [];
    timerSums[name] = 0;

    const activityBlock = document.createElement('div');
    activityBlock.className = 'busyness-holder';

    const activityButton = document.createElement('button');
    activityButton.id = btnIdPrefix + name;
    activityButton.className = btnClassName;
    activityButton.textContent = busydayActivities[name];
    activityButton.addEventListener('click', buttonClick);

    timerButtons[name] = activityButton;

    const informer = document.createElement('span');
    informer.className = 'informer';
    activityButton.appendChild(informer);

    timerInfos[name] = informer;

    activityBlock.appendChild(activityButton);
    container.appendChild(activityBlock);
  }

  const totalBlock = document.createElement('div');
  totalBlock.className = 'busyness-holder';
  const totalInformer = document.createElement('span');
  totalInformer.className = 'busyness-total';
  timerTotal = totalInformer;
  totalBlock.appendChild(totalInformer);
  container.appendChild(totalBlock);

  document.getElementById('timers-flusher').addEventListener('click', flushTimers);

  checkRequirementToAskNotificationPermission().then(
    (answ) => {
      const askBlock = document.createElement('div');
      const askBtn = document.createElement('button');
      askBtn.textContent = 'request permissions for showing a badge';
      askBtn.onclick = () => Notification.requestPermission();
      askBlock.appendChild(askBtn);
      container.appendChild(askBlock);
    },
    () => null,
  );

  tryToRestoreFromStorage();
}

function buttonClick(evnt) {
  const activityName = evnt.currentTarget.id.substring(btnIdPrefix.length);

  if (isTimerActive(activityName)) {
    stopTimer(activityName);
    clearBadge();
  } else {
    for (const key in timers) if (isTimerActive(key)) stopTimer(key);
    runTimer(activityName);
    lighBadge();
  }

  updateTotal();
  saveToStorage();
}

function stopTimer(activityName) {
  const theLastTimer = getTheLastTimerOf(activityName);
  if (theLastTimer && theLastTimer.length === 1) {
    theLastTimer.push(new Date().getTime());
    timerButtons[activityName].className = btnClassName;
    refreshTimerSum(activityName);
    updateInformer(activityName);
  }
}

function runTimer(activityName, btnElement) {
  const theLastTimer = getTheLastTimerOf(activityName);
  if (!theLastTimer || theLastTimer.length === 2) {
    timers[activityName].push([new Date().getTime()]);
    timerButtons[activityName].className = `${btnClassName} ${btnActiveClassName}`;
    updateInformer(activityName);
  }
}

function refreshTimerSum(activityName) {
  timerSums[activityName] = timers[activityName].reduce((sum, curTimer) => {
    return sum + (curTimer.length === 2 ? curTimer[1] - curTimer[0] : 0);
  }, 0);
}

function updateInformer(activityName) {
  const timerSum = timerSums[activityName];
  const passedInfo = stringifyTime(timerSum);
  let runInfo = '';
  if (isTimerActive(activityName)) {
    const runDate = new Date(getTheLastTimerOf(activityName)[0]);
    let minStr = runDate.getMinutes().toString();
    if (minStr.length === 1) minStr = '0' + minStr;
    runInfo = `from ${runDate.getHours()}:${minStr}`;
  }

  timerInfos[activityName].textContent = passedInfo + (passedInfo && runInfo ? ' + ' : '') + runInfo;
}

function updateTotal() {
  const totalSum = Object.keys(timerSums).reduce((acc, cur) => acc + timerSums[cur], 0);
  if (totalSum > 0) {
    timerTotal.textContent = '= ' + stringifyTime(totalSum) + (isAnyTimerActive() ? '...' : '');
  }
}

function flushTimers() {
  for (const key in busydayActivities) {
    timers[key] = [];
    timerSums[key] = 0;
    timerButtons[key].className = btnClassName;
    timerInfos[key].textContent = '';
  }
  localStorage.removeItem('busyday');
  timerTotal.textContent = '';
  clearBadge();
}

function getTheLastTimerOf(activityName) {
  return timers[activityName][timers[activityName].length - 1];
}

function isTimerActive(activityName) {
  const theLastTimer = getTheLastTimerOf(activityName);
  return theLastTimer && theLastTimer.length === 1;
}

function isAnyTimerActive() {
  for (const key in timers) if (isTimerActive(key)) return true;
  return false;
}

function stringifyTime(mseconds) {
  let stringified = '';
  if (mseconds > 0) {
    if (mseconds < 1000) {
      stringified = '< 1 sec';
    } else {
      const psdSec = parseInt(mseconds / 1000);
      stringified = (psdSec % 60).toString().padStart(2, '0');
      if (psdSec > 60) {
        const psdMin = parseInt(psdSec / 60);
        stringified = (psdMin % 60).toString().padStart(2, '0') + ':' + stringified;
        if (psdMin > 60) {
          stringified = parseInt(psdMin / 60).toString() + ':' + stringified;
        }
      } else {
        stringified = '00:' + stringified;
      }
    }
  }
  return stringified;
}

function saveToStorage() {
  localStorage.setItem('busyday', JSON.stringify(timers));
}

function tryToRestoreFromStorage() {
  const savedTimersString = localStorage.getItem('busyday');
  if (!savedTimersString) return;
  let savedTimers = {};
  try {
    savedTimers = JSON.parse(savedTimersString);
  } catch (err) {
    console.warn('Problem with parsing timers from the storage. Flush or fix.');
    return;
  }
  for (const key in timers) {
    timers[key] = savedTimers[key];
    refreshTimerSum(key);
    updateInformer(key);
    timerButtons[key].className = btnClassName + (isTimerActive(key) ? ` ${btnActiveClassName}` : '');
  }
  updateTotal();
  isAnyTimerActive() && lighBadge();
}

function lighBadge() {
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch((error) => {
      console.error('Failed to set badge:', error);
    });
  }
}

function clearBadge() {
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch((error) => {
      console.error('Failed to clear badge:', error);
    });
  }
}

function checkRequirementToAskNotificationPermission() {
  if ('setAppBadge' in navigator && 'permissions' in navigator && 'Notification' in window) {
    return navigator.permissions.query({ name: 'notifications' }).then((result) => {
      if (result.state !== 'granted' && result.state !== 'denied') {
        return true;
      } else {
        throw new Error('nah');
      }
    });
  } else {
    return Promise.reject('nah');
  }
}
