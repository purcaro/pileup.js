/* @flow */
'use strict';

import _ from 'underscore';
import Q from 'q';
import {Events} from 'backbone';

import ContigInterval from '../ContigInterval';
import BigBed from '../data/BigBed';

export type BedRegion = {
    position: ContigInterval<string>;
    id: string;
}

// Flow type for export.
export type BigBedRegionSource = {
  rangeChanged: (newRange: GenomeRange) => void;
  getRegionsInRange: (range: ContigInterval<string>) => BedRegion[];
  on: (event: string, handler: Function) => void;
  off: (event: string) => void;
  trigger: (event: string, ...args:any) => void;
}

// The fields are described at http://genome.ucsc.edu/FAQ/FAQformat#format1
function parseBedFeature(f): BedRegion {
    var position = new ContigInterval(f.contig, f.start, f.stop);
    var id = f.contig + f.start + f.stop;
    
  return {
      position,
      id
  };
}


function createFromBigBedFile(remoteSource: BigBed): BigBedRegionSource {
  // Collection of regions that have already been loaded.
  var regions: {[key:string]: BedRegion} = {};

  // Ranges for which we have complete information -- no need to hit network.
  var coveredRanges: Array<ContigInterval<string>> = [];

  function addBedRegion(newBedRegion) {
    if (!regions[newBedRegion.id]) {
      regions[newBedRegion.id] = newBedRegion;
    }
  }

  function getBedRegionsInRange(range: ContigInterval<string>): BedRegion[] {
    if (!range) return [];
    var results = [];
      _.each(regions, region => {
      if (range.intersects(region.position)) {
        results.push(region);
      }
    });
    return results;
  }

  function fetch(range: GenomeRange) {
    var interval = new ContigInterval(range.contig, range.start, range.stop);

    // Check if this interval is already in the cache.
    if (interval.isCoveredBy(coveredRanges)) {
      return Q.when();
    }

    coveredRanges.push(interval);
    coveredRanges = ContigInterval.coalesce(coveredRanges);

    return remoteSource.getFeatureBlocksOverlapping(interval).then(featureBlocks => {
      featureBlocks.forEach(fb => {
        coveredRanges.push(fb.range);
        coveredRanges = ContigInterval.coalesce(coveredRanges);
        var regions = fb.rows.map(parseBedFeature);
        regions.forEach(region => addBedRegion(region));
        //we have new data from our internal block range
        o.trigger('newdata', fb.range);
      });
    });
  }

  var o = {
    rangeChanged: function(newRange: GenomeRange) {
      fetch(newRange).done();
    },
    getBedRegionsInRange,

    // These are here to make Flow happy.
    on: () => {},
    off: () => {},
    trigger: () => {}
  };
  _.extend(o, Events);  // Make this an event emitter

  return o;
}

function create(data: {url:string}): BigBedRegionSource {
  var url = data.url;
  if (!url) {
    throw new Error(`Missing URL from track: ${JSON.stringify(data)}`);
  }

  return createFromBigBedFile(new BigBed(url));
}

module.exports = {
  create,
  createFromBigBedFile
};
