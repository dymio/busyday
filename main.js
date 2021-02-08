'use strict';

// We suppose that `busydayActivities` object was loaded in config.js (see README)
const btnIdPrefix = 'busy-btn-';
const btnClassName = 'busyness-button';
const btnActiveClassName = 'active';

const timers = {};
const timerSums = {};
const timerButtons = {};
const timerInfos = {};

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

  document.getElementById('timers-flusher').addEventListener('click', flushTimers);

  tryToRestoreFromStorage();
}

function buttonClick(evnt) {
  const activityName = evnt.currentTarget.id.substring(btnIdPrefix.length);

  if (isTimerActive(activityName)) {
    stopTimer(activityName);
  }
  else {
    for (const key in timers) if (isTimerActive(key)) stopTimer(key);
    runTimer(activityName);
  }
}

function stopTimer(activityName) {
  const theLastTimer = getTheLastTimerOf(activityName);
  if (theLastTimer && theLastTimer.length === 1) {
    theLastTimer.push(new Date().getTime());
    timerButtons[activityName].className = btnClassName;
    refreshTimerSum(activityName);
    updateInformer(activityName);
    saveToStorage();
  }
}

function runTimer(activityName, btnElement) {
  const theLastTimer = getTheLastTimerOf(activityName);
  if (!theLastTimer || theLastTimer.length === 2) {
    timers[activityName].push([new Date().getTime()]);
    timerButtons[activityName].className = `${btnClassName} ${btnActiveClassName}`;
    updateInformer(activityName);
    saveToStorage();
  }
}

function refreshTimerSum(activityName) {
  timerSums[activityName] = timers[activityName].reduce((sum, curTimer) => {
    return sum + (curTimer.length === 2 ? curTimer[1] - curTimer[0] : 0);
  }, 0)
}

function updateInformer(activityName) {
  let passedInfo = '';
  const timerSum = timerSums[activityName];
  if (timerSum > 0) {
    if (timerSum < 1000) {
      passedInfo = '< 1 sec';
    }
    else {
      const psdSec = parseInt(timerSum / 1000);
      passedInfo = (psdSec % 60).toString();
      if (psdSec > 60) {
        const psdMin = parseInt(psdSec / 60);
        passedInfo = (psdMin % 60).toString() + ':' + passedInfo;
        if (psdMin > 60) {
          passedInfo = parseInt(psdMin / 60).toString() + ':' + passedInfo;
        }
      }
      else {
        passedInfo = '0:' + passedInfo;
      }
    }
  }

  let runInfo = '';
  if (isTimerActive(activityName)) {
    const runDate = new Date(getTheLastTimerOf(activityName)[0]);
    let minStr = runDate.getMinutes().toString();
    if (minStr.length === 1) minStr = '0' + minStr;
    runInfo = `from ${runDate.getHours()}:${minStr}`;
  }

  timerInfos[activityName].textContent = passedInfo
    + (passedInfo && runInfo ? ' + ' : '')
    + runInfo;
}

function flushTimers() {
  for (const key in busydayActivities) {
    timers[key] = [];
    timerSums[key] = [];
    timerButtons[key].className = btnClassName;
    timerInfos[key].textContent = '';
    localStorage.removeItem('busyday');
  }
}

function isTimerActive(activityName) {
  const theLastTimer = getTheLastTimerOf(activityName);
  return (theLastTimer && theLastTimer.length === 1);
}

function getTheLastTimerOf(activityName) {
  return timers[activityName][timers[activityName].length - 1];
}

function saveToStorage() {
  localStorage.setItem('busyday', JSON.stringify(timers));
}

function tryToRestoreFromStorage() {
  const savedTimersString = localStorage.getItem('busyday');
  console.log('savedTimersString', savedTimersString);
  if (!savedTimersString) return;
  let savedTimers = {};
  try {
    savedTimers = JSON.parse(savedTimersString);
  }
  catch (err) {
    console.warn('Problem with parsing timers from the storage. Flush or fix.');
    return;
  }
  for (const key in timers) {
    timers[key] = savedTimers[key];
    refreshTimerSum(key);
    updateInformer(key);
    timerButtons[key].className = btnClassName + (isTimerActive(key) ? ` ${btnActiveClassName}` : '');
  }
}
