'use strict';
const moment = require('moment-timezone');

module.exports.timezone = (later, timezone) => {
  if (!timezone || typeof timezone !== 'string') {
    throw new Error('Must pass a timezone in string form');
  }
  later.setTimeout = (fn, sched) => {
    const s = later.schedule(sched);
    let t;
    const scheduleTimeout = () => {
      // get the normal 'now' time:
      const now = new Date();
      // get a timezone-adjusted 'now':
      const zone = moment.tz.zone(timezone);
      const offset = zone.offset(now);
      const adjustedNow = new Date(now.getTime() - (60000 * offset));
      // use the timezone-adjusted 'now' to generate the list of nextTimes
      // that laterjs will schedule. then un-adjust each of those next times
      // back to their UTC equivalent:
      const nextTime = s.next(2, adjustedNow).map((time) => {
        const t2 = moment(time);
        t2.add(offset, 'minutes');
        return t2.toDate();
      });
      // the rest of this is identical to laterjs's setTimeout
      let diff = nextTime[0].getTime() - now;
      // minimum time to fire is one second, use nextTime occurrence instead
      if (diff < 1000) {
        diff = nextTime[1] ? nextTime[1].getTime() - now : 1000;
      }
      // expose the time (with timezone) at which the process will first execute:
      later.firstRunMoment = moment(new Date().getTime() + diff).tz(timezone);
      if (diff < 2147483647) {
        t = setTimeout(fn, diff);
      } else {
        t = setTimeout(scheduleTimeout, 2147483647);
      }
    };
    if (fn) {
      scheduleTimeout();
    }
    return {
      isDone: () => !t,
      clear: () => clearTimeout(t)
    };
  };
  return later;
};
