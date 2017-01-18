'use strict';
const test = require('tape');
const moment = require('moment-timezone');
const modifyLater = require('../index.js').timezone;
const _ = require('lodash');

const getMinutes = (val) => {
  const mins = new Date().getMinutes() + val;
  if (mins < 10) {
    return `0${mins}`;
  }
  return mins;
};

test('will over-ride later.setTimeout method', (t) => {
  t.plan(1);
  const later = require('later');
  const oldTimeout = later.setTimeout;
  modifyLater(later, 'America/Los_Angeles');
  t.notEqual(later.setTimeout, oldTimeout);
});

test('current timezone will be same', (t) => {
  t.plan(1);
  const later = require('later');
  const localTimezone = moment.tz.guess();
  modifyLater(later, localTimezone);
  const string = `after ${new Date().getHours()}:${getMinutes(-1)} today`;
  const sched = later.parse.text(string);
  later.setTimeout(() => {
    t.equal(true, true);
  }, sched);
});

test('future timezone will be in the future', (t) => {
  t.plan(1);
  const getOffset = (zoneName) => {
    const now = new Date();
    const zone = moment.tz.zone(zoneName);
    return zone.offset(now);
  };
  let later = require('later');
  const localTimezone = moment.tz.guess();
  const localOffset = getOffset(localTimezone);
  // get a future time zone+ offset in minutes:
  // if this won't work try manually setting to a future timezone
  let futureZone;
  let futureOffset;
  const allTimezones = _.values(moment.tz._names);
  for (let i = 0; i < allTimezones.length; i++) {
    futureZone = allTimezones[i];
    futureOffset = getOffset(futureZone);
    if (futureOffset - localOffset === 60 ) {
      break;
    }
  }
  later = modifyLater(later, futureZone);
  // a local timeout that is 1 minute in the past won't fire
  // because it's not yet that time in the future timezone:
  const string = `after ${new Date().getHours()}:${getMinutes(-1)} today`;
  const sched = later.parse.text(string);
  const controller = later.setTimeout(() => {
    t.fail();
  }, sched);
  setTimeout(() => {
    controller.clear();
    t.equal(true, true);
  }, 5000);
});

test('past timezone will be in the past', (t) => {
  t.plan(1);
  const getOffset = (zoneName) => {
    const now = new Date();
    const zone = moment.tz.zone(zoneName);
    return zone.offset(now);
  };
  let later = require('later');
  const localTimezone = moment.tz.guess();
  const localOffset = getOffset(localTimezone);
  // get a past time zone+ offset in minutes:
  // if this won't work try manually setting this to a past timezone
  let pastZone;
  let pastOffset;
  const allTimezones = _.values(moment.tz._names);
  for (let i = 0; i < allTimezones.length; i++) {
    pastZone = allTimezones[i];
    pastOffset = getOffset(pastZone);
    if (pastOffset < localOffset) {
      break;
    }
  }
  later = modifyLater(later, pastZone);
  // a timeout in local time that is 1 minute in the future
  // should fire immediately, since it's already past that time
  // in the pastZone:
  const string = `after ${new Date().getHours()}:${getMinutes(1)} today`;
  const sched = later.parse.text(string);
  const start = new Date().getTime();
  later.setTimeout(() => {
    t.equal(new Date().getTime() - start < 5000, true);
  }, sched);
});
