import { useState } from 'react';
import { weaponsApi, type Weapon } from '../api/weapons';
import { armorsApi, type Armor } from '../api/armors';
import { lootApi, type Loot } from '../api/loot';
import { consumablesApi, type Consumable } from '../api/consumables';
import { gameSetsApi } from '../api/gameSets';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, ContentCardList, MetaChip } from '../components/ContentCard';
import WeaponForm from '../components/WeaponForm';
import ArmorForm from '../components/ArmorForm';
import SimpleNameDescriptionForm from '../components/SimpleNameDescriptionForm';
import './BrowsePage.css';

function WeaponCard({ w, onEdit, onDelete }: { w: Weapon; onEdit: () => void; onDelete: () => void }) {
  return (
    <ContentCard
      title={w.name}
      onEdit={onEdit}
      onDelete={onDelete}
      meta={
        <>
          <MetaChip label="Slot" value={titleCaseEnum(w.weaponSlot)} />
          <MetaChip label="Tier" value={w.tier} />
          <MetaChip label="Burden" value={titleCaseEnum(w.burden)} />
          <MetaChip label="Damage" value={w.damage} />
          <MetaChip label="Trait" value={w.trait && titleCaseEnum(w.trait)} />
          <MetaChip label="Type" value={w.damageType && titleCaseEnum(w.damageType)} />
        </>
      }
    >
      {w.feature && <p className="content-card__description">{w.feature}</p>}
    </ContentCard>
  );
}

function ArmorCard({ a, onEdit, onDelete }: { a: Armor; onEdit: () => void; onDelete: () => void }) {
  return (
    <ContentCard
      title={a.name}
      onEdit={onEdit}
      onDelete={onDelete}
      meta={
        <>
          <MetaChip label="Tier" value={a.tier} />
          <MetaChip label="Base Score" value={a.baseScore} />
          <MetaChip
            label="Thresholds"
            value={a.thresholds.major != null || a.thresholds.severe != null ? `${a.thresholds.major ?? '—'} / ${a.thresholds.severe ?? '—'}` : null}
          />
        </>
      }
    >
      {a.feature && <p className="content-card__description">{a.feature}</p>}
    </ContentCard>
  );
}

function NameDescriptionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Loot | Consumable;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ContentCard title={item.name} onEdit={onEdit} onDelete={onDelete}>
      {item.description && <p className="content-card__description">{item.description}</p>}
    </ContentCard>
  );
}

export default function EquipmentPage() {
  const weapons = useApiList(weaponsApi.list);
  const armors = useApiList(armorsApi.list);
  const loot = useApiList(lootApi.list);
  const consumables = useApiList(consumablesApi.list);
  const gameSets = useApiList(gameSetsApi.list);

  const [editingWeaponId, setEditingWeaponId] = useState<string | null>(null);
  const [editingArmorId, setEditingArmorId] = useState<string | null>(null);
  const [editingLootId, setEditingLootId] = useState<string | null>(null);
  const [editingConsumableId, setEditingConsumableId] = useState<string | null>(null);

  async function handleDeleteWeapon(w: Weapon) {
    if (!window.confirm(`Delete "${w.name}"? This can't be undone.`)) return;
    try {
      await weaponsApi.remove(w.id);
      weapons.remove(w.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Weapon.');
    }
  }

  async function handleDeleteArmor(a: Armor) {
    if (!window.confirm(`Delete "${a.name}"? This can't be undone.`)) return;
    try {
      await armorsApi.remove(a.id);
      armors.remove(a.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Armor.');
    }
  }

  async function handleDeleteLoot(l: Loot) {
    if (!window.confirm(`Delete "${l.name}"? This can't be undone.`)) return;
    try {
      await lootApi.remove(l.id);
      loot.remove(l.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Loot.');
    }
  }

  async function handleDeleteConsumable(c: Consumable) {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try {
      await consumablesApi.remove(c.id);
      consumables.remove(c.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Consumable.');
    }
  }

  return (
    <div className="browse-page">
      <h1 className="browse-page__title">Equipment</h1>

      <div className="browse-page__section">
        <h2 className="browse-page__section-title">Weapons</h2>
        {weapons.loading && <p className="browse-page__status">Loading Weapons&hellip;</p>}
        {weapons.error && <p className="browse-page__status browse-page__status--error">{weapons.error}</p>}
        {!weapons.loading && !weapons.error && (
          <ContentCardList
            items={weapons.items}
            emptyMessage="No Weapons yet — create one from Home first."
            getKey={(w) => w.id}
            renderItem={(w) =>
              editingWeaponId === w.id ? (
                <WeaponForm
                  gameSets={gameSets.items}
                  weaponSlot={w.weaponSlot}
                  initial={w}
                  onSaved={(saved) => {
                    weapons.upsert(saved);
                    setEditingWeaponId(null);
                  }}
                  onCancel={() => setEditingWeaponId(null)}
                />
              ) : (
                <WeaponCard w={w} onEdit={() => setEditingWeaponId(w.id)} onDelete={() => handleDeleteWeapon(w)} />
              )
            }
          />
        )}
      </div>

      <div className="browse-page__section">
        <h2 className="browse-page__section-title">Armor</h2>
        {armors.loading && <p className="browse-page__status">Loading Armor&hellip;</p>}
        {armors.error && <p className="browse-page__status browse-page__status--error">{armors.error}</p>}
        {!armors.loading && !armors.error && (
          <ContentCardList
            items={armors.items}
            emptyMessage="No Armor yet — create one from Home first."
            getKey={(a) => a.id}
            renderItem={(a) =>
              editingArmorId === a.id ? (
                <ArmorForm
                  gameSets={gameSets.items}
                  initial={a}
                  onSaved={(saved) => {
                    armors.upsert(saved);
                    setEditingArmorId(null);
                  }}
                  onCancel={() => setEditingArmorId(null)}
                />
              ) : (
                <ArmorCard a={a} onEdit={() => setEditingArmorId(a.id)} onDelete={() => handleDeleteArmor(a)} />
              )
            }
          />
        )}
      </div>

      <div className="browse-page__section">
        <h2 className="browse-page__section-title">Loot</h2>
        {loot.loading && <p className="browse-page__status">Loading Loot&hellip;</p>}
        {loot.error && <p className="browse-page__status browse-page__status--error">{loot.error}</p>}
        {!loot.loading && !loot.error && (
          <ContentCardList
            items={loot.items}
            emptyMessage="No Loot yet — create one from Home first."
            getKey={(l) => l.id}
            renderItem={(l) =>
              editingLootId === l.id ? (
                <SimpleNameDescriptionForm
                  title="Loot"
                  submitLabel="Create Loot"
                  gameSets={gameSets.items}
                  initial={l}
                  create={lootApi.create}
                  update={lootApi.update}
                  onSaved={(saved) => {
                    loot.upsert(saved);
                    setEditingLootId(null);
                  }}
                  onCancel={() => setEditingLootId(null)}
                />
              ) : (
                <NameDescriptionCard item={l} onEdit={() => setEditingLootId(l.id)} onDelete={() => handleDeleteLoot(l)} />
              )
            }
          />
        )}
      </div>

      <div className="browse-page__section">
        <h2 className="browse-page__section-title">Consumables</h2>
        {consumables.loading && <p className="browse-page__status">Loading Consumables&hellip;</p>}
        {consumables.error && <p className="browse-page__status browse-page__status--error">{consumables.error}</p>}
        {!consumables.loading && !consumables.error && (
          <ContentCardList
            items={consumables.items}
            emptyMessage="No Consumables yet — create one from Home first."
            getKey={(c) => c.id}
            renderItem={(c) =>
              editingConsumableId === c.id ? (
                <SimpleNameDescriptionForm
                  title="Consumable"
                  submitLabel="Create Consumable"
                  gameSets={gameSets.items}
                  initial={c}
                  create={consumablesApi.create}
                  update={consumablesApi.update}
                  onSaved={(saved) => {
                    consumables.upsert(saved);
                    setEditingConsumableId(null);
                  }}
                  onCancel={() => setEditingConsumableId(null)}
                />
              ) : (
                <NameDescriptionCard
                  item={c}
                  onEdit={() => setEditingConsumableId(c.id)}
                  onDelete={() => handleDeleteConsumable(c)}
                />
              )
            }
          />
        )}
      </div>
    </div>
  );
}
