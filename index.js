'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird');

const r = require('ramda')
  , rUtils = require('./r-utils')
  ;


//------//
// Init //
//------//

const { defImmutableProps, invoke, mutableAssoc } = rUtils;


//------//
// Main //
//------//

const create = ({ size, onSettled = r.always(undefined) }) => {
  const promisePool = getPromisePool(size)
    , promiseFnFifo = []
    ;

  const pool = { onSettled };

  return defImmutableProps(
    pool
    , [
      ['add', createAdd({ promisePool, pool, promiseFnFifo })]
      , ['size', size]
    ]
  );
};


//-------------//
// Helper Fxns //
//-------------//

function getPromisePool(size) {
  return r.pipe(
    r.range(0)
    , r.map(() => bPromise.resolve())
  )(size);
}

function createAdd({ promisePool, pool, promiseFnFifo }) {
  const placeInPool = createPlaceInPool({ promisePool, pool, promiseFnFifo });
  return aPromiseFn => {
    const availableIndex = r.findIndex(r.complement(invoke('isPending')), promisePool);

    if (availableIndex === -1) promiseFnFifo.push(aPromiseFn);
    else placeInPool(availableIndex, aPromiseFn);

    return pool;
  };
}

function createPlaceInPool({ promisePool, pool, promiseFnFifo }) {
  const setPoolAt = mutableAssoc(r.__, r.__, promisePool)
    , callFifoNothingOrSettled = createCallFifoNothingOrSettled({ promisePool, pool, promiseFnFifo })
    ;

  return (availableIndex, aPromiseFn) => {
    setPoolAt(
      availableIndex
      , aPromiseFn().then(callFifoNothingOrSettled)
    );
  };
}

function createCallFifoNothingOrSettled({ promisePool, pool, promiseFnFifo }) {
  return callFifoNothingOrSettled;

  function callFifoNothingOrSettled() {
    let res;

    if (promiseFnFifo.length) res = promiseFnFifo.shift()().then(callFifoNothingOrSettled);
    else if (r.filter(invoke('isPending'), promisePool).length === 1) res = pool.onSettled();

    return res;
  }
}


//---------//
// Exports //
//---------//

module.exports = { create };
