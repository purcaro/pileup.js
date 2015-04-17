/* @flow */
'use strict';

var _ = require('underscore');
var Interval = require('./Interval');

/**
 * Class representing a closed interval on the genome: contig:start-stop.
 *
 * The contig may be either a string ("chr22") or a number (in case the contigs
 * are indexed, for example).
 */
class ContigInterval<T: (number|string)> {
  contig: T;
  interval: Interval;

  constructor(contig: T, start: number, stop: number) {
    this.contig = contig;
    this.interval = new Interval(start, stop);
  }

  // TODO: make these getter methods & switch to Babel.
  start(): number {
    return this.interval.start;
  }
  stop(): number {
    return this.interval.stop;
  }
  length(): number {
    return this.interval.length();
  }

  intersects(other: ContigInterval<T>): boolean {
    return (this.contig === other.contig &&
            this.interval.intersects(other.interval));
  }

  containsInterval(other: ContigInterval<T>): boolean {
    return (this.contig === other.contig &&
            this.interval.containsInterval(other.interval));
  }

  isAdjacentTo(other: ContigInterval<T>): boolean {
    return (this.contig === other.contig &&
            (this.start() == 1 + other.stop() ||
             this.stop() + 1 == other.start()));
  }

  /*
  This method doesn't typecheck. See https://github.com/facebook/flow/issues/388
  isAfterInterval(other: ContigInterval): boolean {
    return (this.contig > other.contig ||
            (this.contig === other.contig && this.start() > other.start()));
  }
  */

  toString(): string {
    return `${this.contig}:${this.start()}-${this.stop()}`;
  }

  // Sort an array of intervals & coalesce adjacent/overlapping ranges.
  // NB: this may re-order the intervals parameter
  static coalesce(intervals: ContigInterval[]): ContigInterval[] {
    intervals.sort((a, b) => {
      if (a.contig > b.contig) {
        return -1;
      } else if (a.contig < b.contig) {
        return +1;
      } else {
        return a.start() - b.start();
      }
    });

    var rs = [];
    intervals.forEach(r => {
      if (rs.length === 0) {
        rs.push(r);
        return;
      }

      var lastR = rs[rs.length - 1];
      if (r.intersects(lastR) || r.isAdjacentTo(lastR)) {
        lastR.interval.stop = Math.max(r.interval.stop, lastR.interval.stop);
      } else {
        rs.push(r);
      }
    });

    return rs;
  }
}

module.exports = ContigInterval;
