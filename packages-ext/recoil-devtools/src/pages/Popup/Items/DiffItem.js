/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * Recoil DevTools browser extension.
 *
 * @emails oncall+recoil
 * @flow strict-local
 * @format
 * @oncall recoil
 */
'use strict';

import ItemDependencies from './ItemDependencies';

const {formatForDiff} = require('../../../utils/Serialization');
const ConnectionContext = require('../ConnectionContext');
const {useSelectedTransaction} = require('../useSelectionHooks');
const CollapsibleItem = require('./CollapsibleItem');
const ItemDescription = require('./ItemDescription');
const ItemLabel = require('./ItemLabel');
const ItemMoreItems = require('./ItemMoreItems');
const JsonDiff = require('jsondiffpatch-for-react').default;
const nullthrows = require('nullthrows');
const React = require('react');
const {useMemo} = require('react');
const {useContext} = require('react');

const styles = {
  valuesHolder: {
    display: 'flex',
    justifyContent: 'stretch',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
};

type Props = {
  name: string,
  startCollapsed?: boolean,
  isRoot?: boolean,
};

function DiffItem({
  name,
  startCollapsed = false,
  isRoot = false,
}: Props): React.Node {
  const connection = nullthrows(useContext(ConnectionContext));
  const [txID] = useSelectedTransaction();

  const {tree} = connection;
  const {value, previous} = useMemo(
    () => ({
      value: tree.get(name, txID),
      previous: tree.get(name, txID - 1),
    }),
    [tree, txID, name],
  );

  return (
    <CollapsibleItem
      key={name}
      isRoot={isRoot}
      label={
        <>
          <ItemLabel
            name={name}
            node={connection.getNode(name)}
            isRoot={isRoot}
          />
          <ItemDescription content={value} previous={previous} />
        </>
      }
      startCollapsed={startCollapsed}>
      <div style={styles.valuesHolder}>
        <JsonDiff left={formatForDiff(previous)} right={formatForDiff(value)} />
      </div>
      <ItemMoreItems content={value} />
      <ItemDependencies name={name} />
    </CollapsibleItem>
  );
}

export default DiffItem;
