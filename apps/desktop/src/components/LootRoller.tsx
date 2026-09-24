import { useState } from 'react';
import { lootApi } from '../api/loot';
import { consumablesApi } from '../api/consumables';
import { lootTablesApi, type LootTable } from '../api/lootTables';
import { consumableTablesApi, type ConsumableTable } from '../api/consumableTables';
import type { LootLogEntry, LootLogResult, NewLootLogEntry } from '../api/sessions';
import { useApiList } from '../lib/useApiList';
import { useGameSets } from '../context/GameSetsContext';
import { RARITIES, type Rarity } from '../lib/lootRarity';
import { rarityPoolSizes, resolveTableRoll, rollD12Pool, sumPool } from '../lib/lootRoll';
import { titleCaseEnum } from '../lib/format';
import './LootRoller.css';

interface LootRollerProps {
  lootLog: LootLogEntry[];
  /** The session being viewed — entries rolled in an earlier one are shown as carried over. */
  sessionId: string;
  onRoll: (entry: NewLootLogEntry) => void;
  /** Hides an entry from this session onward. */
  onRemove: (entryId: string) => void;
}

interface RollableTable {
  key: string;
  type: 'LOOT' | 'CONSUMABLE';
  table: LootTable | ConsumableTable;
}

// Fully self-contained: fetches its own reference data (Loot/Consumable
// Tables and the items they reference) and only ever hands a finished
// roll back up via onRoll — the parent decides how (and whether)
// to persist it. That's what lets this exact component be dropped onto any
// future screen that just needs a "roll and report the result" button.
export default function LootRoller({ lootLog, sessionId, onRoll, onRemove }: LootRollerProps) {
  const { gameSets } = useGameSets();
  const lootTables = useApiList(lootTablesApi.list);
  const consumableTables = useApiList(consumableTablesApi.list);
  const loot = useApiList(lootApi.list);
  const consumables = useApiList(consumablesApi.list);

  const [rarity, setRarity] = useState<Rarity>('COMMON');
  const [poolSize, setPoolSize] = useState<number>(rarityPoolSizes('COMMON')[0]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  function handleRarityChange(next: Rarity) {
    setRarity(next);
    setPoolSize(rarityPoolSizes(next)[0]);
  }

  function toggleTable(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const rollableTables: RollableTable[] = [
    ...lootTables.items.map((table): RollableTable => ({ key: `LOOT:${table.id}`, type: 'LOOT', table })),
    ...consumableTables.items.map((table): RollableTable => ({ key: `CONSUMABLE:${table.id}`, type: 'CONSUMABLE', table })),
  ];

  function itemName(type: 'LOOT' | 'CONSUMABLE', itemId: string): string {
    const list = type === 'LOOT' ? loot.items : consumables.items;
    return list.find((i) => i.id === itemId)?.name ?? 'Unknown item';
  }

  function gameSetName(gameSetId: string): string {
    return gameSets.find((g) => g.id === gameSetId)?.name ?? 'Unknown Set';
  }

  function roll() {
    const selected = rollableTables.filter((t) => selectedKeys.has(t.key));
    if (selected.length === 0) return;

    const dice = rollD12Pool(poolSize);
    const total = sumPool(dice);

    const results: LootLogResult[] = selected.map(({ type, table }) => {
      const entries = table.entries[rarity];
      const match =
        type === 'LOOT'
          ? resolveTableRoll(entries as { position: number; lootId: string }[], total)
          : resolveTableRoll(entries as { position: number; consumableId: string }[], total);
      const itemId = match ? (type === 'LOOT' ? (match as { lootId: string }).lootId : (match as { consumableId: string }).consumableId) : null;
      return {
        tableId: table.id,
        tableName: table.name,
        gameSetName: gameSetName(table.gameSetId),
        tableType: type,
        itemId,
        itemName: itemId ? itemName(type, itemId) : null,
      };
    });

    onRoll({ rolledAt: new Date().toISOString(), rarity, poolSize, rollTotal: total, results });
  }

  const sortedLog = [...lootLog].sort((a, b) => b.rolledAt.localeCompare(a.rolledAt));

  return (
    <div className="loot-roller">
      <h3 className="loot-roller__title">Loot Roller</h3>

      <div className="loot-roller__rarities">
        {RARITIES.map((r) => (
          <button
            key={r}
            type="button"
            className={`loot-roller__rarity${rarity === r ? ' loot-roller__rarity--active' : ''}`}
            onClick={() => handleRarityChange(r)}
          >
            {titleCaseEnum(r)}
          </button>
        ))}
      </div>

      <div className="loot-roller__pool-sizes">
        {rarityPoolSizes(rarity).map((size) => (
          <button
            key={size}
            type="button"
            className={`loot-roller__pool-size${poolSize === size ? ' loot-roller__pool-size--active' : ''}`}
            onClick={() => setPoolSize(size)}
          >
            {size}d12
          </button>
        ))}
      </div>
      <p className="loot-roller__hint">
        The corebook's item-rarity guide: pick either pool size for {titleCaseEnum(rarity)}, roll it, and the sum
        picks a position in each table you've selected below.
      </p>

      {rollableTables.length === 0 ? (
        <p className="loot-roller__empty">
          No Loot or Consumable Tables exist yet — build one on the Equipment page first.
        </p>
      ) : (
        <div className="loot-roller__tables">
          {rollableTables.map(({ key, type, table }) => (
            <label key={key} className="loot-roller__table-option">
              <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleTable(key)} />
              {table.name} <span className="loot-roller__table-type">({type === 'LOOT' ? 'Loot' : 'Consumable'})</span>
            </label>
          ))}
        </div>
      )}

      <button type="button" className="loot-roller__roll" onClick={roll} disabled={selectedKeys.size === 0}>
        Roll {poolSize}d12
      </button>

      {sortedLog.length > 0 && (
        <div className="loot-roller__log">
          {sortedLog.map((entry) => (
            <div key={entry.id} className="loot-roller__log-entry">
              <div className="loot-roller__log-header">
                <span>
                  {titleCaseEnum(entry.rarity)}
                  {entry.sessionId !== sessionId && <em className="loot-roller__carried"> &middot; carried over</em>}
                </span>
                <span>
                  {entry.poolSize}d12 &rarr; {entry.rollTotal}
                  <button
                    type="button"
                    className="loot-roller__log-remove"
                    aria-label="Remove from the loot log"
                    title="Remove from this session onward"
                    onClick={() => onRemove(entry.id)}
                  >
                    &times;
                  </button>
                </span>
              </div>
              <ul className="loot-roller__log-results">
                {entry.results.map((result, i) => (
                  <li key={i}>
                    <strong>
                      {result.tableName} ({result.gameSetName}):
                    </strong>{' '}
                    {result.itemName ?? 'Nothing found'}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
