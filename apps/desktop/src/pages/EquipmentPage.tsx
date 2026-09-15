import { weaponsApi, type Weapon } from '../api/weapons';
import { armorsApi, type Armor } from '../api/armors';
import { lootApi, type Loot } from '../api/loot';
import { consumablesApi, type Consumable } from '../api/consumables';
import { useApiList } from '../lib/useApiList';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, ContentCardList, MetaChip } from '../components/ContentCard';
import './BrowsePage.css';

function WeaponCard({ w }: { w: Weapon }) {
  return (
    <ContentCard
      title={w.name}
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

function ArmorCard({ a }: { a: Armor }) {
  return (
    <ContentCard
      title={a.name}
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

function NameDescriptionCard({ item }: { item: Loot | Consumable }) {
  return (
    <ContentCard title={item.name}>{item.description && <p className="content-card__description">{item.description}</p>}</ContentCard>
  );
}

export default function EquipmentPage() {
  const weapons = useApiList(weaponsApi.list);
  const armors = useApiList(armorsApi.list);
  const loot = useApiList(lootApi.list);
  const consumables = useApiList(consumablesApi.list);

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
            renderItem={(w) => <WeaponCard w={w} />}
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
            renderItem={(a) => <ArmorCard a={a} />}
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
            renderItem={(l) => <NameDescriptionCard item={l} />}
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
            renderItem={(c) => <NameDescriptionCard item={c} />}
          />
        )}
      </div>
    </div>
  );
}
