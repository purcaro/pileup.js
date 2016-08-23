/* @flow */
'use strict';

import {expect} from 'chai';

import BigBed from '../../main/data/BigBed';
import BigBedRegionDataSource from '../../main/sources/BigBedRegionDataSource';
import ContigInterval from '../../main/ContigInterval';

describe('BigBedRegionDataSource', function() {
  function getTestSource() {
    // See test/data/README.md
    return BigBedRegionDataSource.createFromBigBedFile(
        new BigBed('/test-data/cre.random.sorted.bigBed'));
  }

  it('should extract features in a range', function(done) {
    this.timeout(5000);
    var source = getTestSource();

    // No regions fetched initially
    var regionRange = new ContigInterval('chr14', 104800723, 104800865);
    var region = source.getBedRegionsInRange(regionRange);
    expect(region).to.deep.equal([]);

    // Fetching that one region should cache its entire block.
    source.on('newdata', () => {
      var rs = source.getBedRegionsInRange(regionRange);
      expect(rs).to.have.length(1);

      var r = rs[0];
	expect(r.id).to.equal('chr14104800720104800870');
	//expect(regionst).to.have.length(11);
      done();
    });
    source.rangeChanged({
      contig: regionRange.contig,
    });
  });
});
