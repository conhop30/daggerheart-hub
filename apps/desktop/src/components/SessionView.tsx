import { useEffect, useRef, useState } from 'react';
import { sessionsApi, type NewLootLogEntry, type Session, type UpdateSessionRequest } from '../api/sessions';
import { sessionAdversariesApi, type SessionAdversary, type UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import { combatsApi, type Combat, type UpdateCombatRequest } from '../api/combats';
import { partyMembersApi } from '../api/partyMembers';
import { planMinionMove, planPickUp, stackToJoin, type MoveAmount, type MoveTarget } from '../lib/minionGroups';
import BattlePointsBar from './BattlePointsBar';
import SessionForm from './SessionForm';
import FearTrack from './FearTrack';
import SessionMusicPanel from './SessionMusicPanel';
import CombatPanel, { type CombatSpotlightSignal } from './CombatPanel';
import TabBar from './TabBar';
import SessionCombatSidebar from './SessionCombatSidebar';
import LootRoller from './LootRoller';
import SessionNotesPanel, { type NotesTabSignal } from './SessionNotesPanel';
import SessionSectionShell from './SessionSectionShell';
import DiceTray from './DiceTray';
import RollLogPanel from './RollLogPanel';
import { useRollLog } from '../context/RollLogContext';
import { useMusicContext } from '../context/MusicContext';
import { useDragReorder } from '../lib/useDragReorder';
import { loadSectionOrder, saveSectionOrder, type SessionSectionId } from '../lib/sessionSectionOrder';
import './SessionView.css';

const SECTION_TITLES: Record<SessionSectionId, string> = {
  ADVERSARIES: 'Adversaries',
  NOTES: 'Notes',
};

interface SessionViewProps {
  session: Session;
  campaignId: string;
  /** The Campaign's party level — sets the party's tier for Battle Points. */
  campaignLevel: number;
  onBack: () => void;
  onSessionSaved: (session: Session) => void;
  onSessionDeleted: (id: string) => void;
}

// A thin shell, not the owner of any panel's data — it wires FearTrack,
// CombatPanel and the Notes together, but each of those manages (or is handed)
// its own state. Ripping out and rebuilding any one panel never means
// touching this file beyond the single line that renders it.
//
// Nearly everything on this screen follows the Campaign into later sessions
// (Fear, the Party, pulled-in combatants, the loot log); only the name
// belongs to this session alone. See electron/carry.js for the rules.
export default function SessionView({ session, campaignId, campaignLevel, onBack, onSessionSaved, onSessionDeleted }: SessionViewProps) {
  const [editing, setEditing] = useState(false);

  // Owned here (not by CombatPanel) because SessionCombatSidebar shows this
  // very same live list at the same time, on the same screen — both need to
  // agree the instant one of them changes something, so there's one source
  // of truth instead of two independent fetches drifting apart.
  const [sessionAdversaries, setSessionAdversaries] = useState<SessionAdversary[]>([]);
  const [adversariesLoading, setAdversariesLoading] = useState(true);
  const [adversariesError, setAdversariesError] = useState<string | null>(null);

  // Combat tabs: independent workspaces within the Adversaries section, each
  // scoping its own Adversary/Environment roster — see api/combats.ts and
  // electron/store.js's "Combats" section. Fetched once per session and
  // filtered client-side by activeCombatId (see activeSessionAdversaries
  // below), the same approach already used for sessionAdversaries itself.
  const [combats, setCombats] = useState<Combat[]>([]);
  const [activeCombatId, setActiveCombatId] = useState<string | null>(null);
  const [combatsLoading, setCombatsLoading] = useState(true);
  // Guards the floor-guard effect below against double-firing while its own
  // create() is still in flight — see that effect's comment.
  const floorGuardRan = useRef(false);
  // How many PCs the Campaign's Party has as of this session — all Battle
  // Points needs of it (the roster itself is managed on the Campaign page,
  // not here). A tab can override the number.
  const [partyCount, setPartyCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    partyMembersApi
      .listBySession(session.id)
      .then((members) => {
        if (!cancelled) setPartyCount(members.length);
      })
      .catch(() => {
        // Battle Points just budgets for one PC until a tab says otherwise.
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  // Clicking a Combat tab also brings up the Notes tab of the same name,
  // if there is one — see SessionNotesPanel.
  const [notesTabSignal, setNotesTabSignal] = useState<NotesTabSignal | null>(null);
  function selectCombat(id: string) {
    setActiveCombatId(id);
    const combat = combats.find((c) => c.id === id);
    if (combat) setNotesTabSignal({ name: combat.name, key: Date.now() });
  }

  // A SessionCombatSidebar row click sets this; CombatPanel reacts by
  // spotlighting the matching tile. `key` changes on every click (even a
  // repeat click of the same Adversary) so that effect can tell "clicked
  // again" apart from a re-render that changed nothing.
  const [combatSpotlight, setCombatSpotlight] = useState<CombatSpotlightSignal | null>(null);

  // Adversaries and Notes are drag-reorderable, the same way Journal
  // entries already are — a global GM layout preference (see
  // sessionSectionOrder.ts), not per-session data.
  const [sectionOrder, setSectionOrder] = useState<SessionSectionId[]>(loadSectionOrder());
  const { getHandleProps, getRowClassName } = useDragReorder(sectionOrder, (next) => {
    setSectionOrder(next);
    saveSectionOrder(next);
  });

  // Table chatter, not campaign data (never persisted to disk, see
  // lib/rollLog) but kept alive for the life of the app run even while this
  // view unmounts — see RollLogContext. Shared between Roll Damage/Roll
  // Attack and the DiceTray since both fire into the same log.
  const { entries: rollLog, addRoll, clear: clearRollLog } = useRollLog(session.id);

  const { setSession: setMusicSession, setViewingSessionId, clearIfSession } = useMusicContext();

  useEffect(() => {
    let cancelled = false;
    setAdversariesLoading(true);
    setAdversariesError(null);
    sessionAdversariesApi
      .listBySession(session.id)
      .then((list) => {
        if (!cancelled) setSessionAdversaries(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setAdversariesError(err instanceof Error ? err.message : 'Could not load this session’s Adversaries.');
      })
      .finally(() => {
        if (!cancelled) setAdversariesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  useEffect(() => {
    let cancelled = false;
    // Reset per session.id, not just once ever — otherwise navigating from
    // one empty Session (which just fired the guard) to a second, also-
    // empty Session would see this still true and skip its own guard.
    floorGuardRan.current = false;
    setCombatsLoading(true);
    combatsApi
      .listBySession(session.id)
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.order - b.order);
        setCombats(sorted);
        setActiveCombatId((prev) => (prev && sorted.some((c) => c.id === prev) ? prev : sorted[0]?.id ?? null));
      })
      .catch((err) => window.alert(err instanceof Error ? err.message : 'Could not load this session’s Combat tabs.'))
      .finally(() => {
        if (!cancelled) setCombatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  // Floor-guard: a Session must never show zero Combat tabs. The useRef (not
  // useState) is what makes this race-safe — it's set synchronously before
  // create()'s promise settles, so a second effect run while that create is
  // still in flight sees it already true and bails, instead of firing twice.
  useEffect(() => {
    if (combatsLoading || combats.length > 0 || floorGuardRan.current) return;
    floorGuardRan.current = true;
    combatsApi
      .create({ sessionId: session.id, name: 'Combat', order: 0 })
      .then((created) => {
        setCombats([created]);
        setActiveCombatId(created.id);
      })
      .catch((err) => {
        window.alert(err instanceof Error ? err.message : 'Could not create this session’s first Combat tab.');
      })
      // Re-armed either way: the guard only has to cover the in-flight
      // window, and it must fire again when the last tab is deleted later.
      .finally(() => {
        floorGuardRan.current = false;
      });
  }, [combatsLoading, combats.length, session.id]);

  // An Adversary pulled in before Combat tabs existed has no combatId. It's
  // adopted into the first tab, once and for good (persisted, so a later
  // reorder doesn't move it) — showing it in every tab instead would make
  // every tab look identical for a Campaign that predates this feature.
  // Gated on both loads having settled for this session, so a stale tab
  // list from the previously viewed session can never be the adopter.
  const firstCombatId = combatsLoading ? null : combats[0]?.id ?? null;
  useEffect(() => {
    if (!firstCombatId || adversariesLoading) return;
    const unassigned = sessionAdversaries.filter((a) => a.combatId == null);
    if (unassigned.length === 0) return;
    setSessionAdversaries((prev) => prev.map((a) => (a.combatId == null ? { ...a, combatId: firstCombatId } : a)));
    (async () => {
      try {
        for (const a of unassigned) {
          await sessionAdversariesApi.update(a.id, { combatId: firstCombatId }, { sessionId: session.id });
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not move older Adversaries into the first Combat tab.');
      }
    })();
  }, [firstCombatId, adversariesLoading, sessionAdversaries, session.id]);

  // Everything pulled into the active tab, then split by whether it's
  // still in the fight. Battle Points score the whole encounter as built
  // (killing something doesn't make the fight it was part of cheaper); the
  // board and the compact list only show what's still standing.
  const tabAdversaries = activeCombatId ? sessionAdversaries.filter((a) => a.combatId === activeCombatId) : [];
  const activeSessionAdversaries = tabAdversaries.filter((a) => !a.slain);
  const slainAdversaries = tabAdversaries.filter((a) => a.slain);
  const activeCombat = combats.find((c) => c.id === activeCombatId) ?? null;

  // Sequential, not Promise.all — CombatPanel's duplicate-suffix numbering
  // (#1, #2, ...) is derived purely from sessionAdversaries' list order, and
  // Promise.all would let N creates settle in a nondeterministic order.
  // A Minion (asStack) arrives as one stack of `quantity` instead of that
  // many tiles, folding into a lone stack of the same Minion if this tab
  // already has one — see lib/minionGroups.
  async function pullInAdversary(adversaryId: string, quantity: number, combatId: string, asStack: boolean) {
    try {
      if (asStack) {
        const existing = stackToJoin(sessionAdversaries, adversaryId, combatId);
        if (existing) {
          await handleAdversaryChange(existing, { count: existing.count + quantity });
          return;
        }
        const pulled = await sessionAdversariesApi.create({ sessionId: session.id, adversaryId, combatId, count: quantity });
        setSessionAdversaries((prev) => [...prev, pulled]);
        return;
      }
      for (let i = 0; i < quantity; i++) {
        const pulled = await sessionAdversariesApi.create({ sessionId: session.id, adversaryId, combatId });
        setSessionAdversaries((prev) => [...prev, pulled]);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not pull that Adversary in.');
    }
  }

  // Defeating the last Minion of a stack removes the stack itself — there's
  // no such thing as a tile for zero Minions.
  // A defeated Minion joins the Slain list like anything else that's
  // killed: as one more on the slain stack of that same Minion.
  async function handleMinionCount(adversary: SessionAdversary, delta: number) {
    if (delta > 0) {
      handleAdversaryChange(adversary, { count: adversary.count + delta });
      return;
    }
    const slainStack = slainAdversaries.find((a) => a.adversaryId === adversary.adversaryId);
    try {
      if (adversary.count <= 1) {
        if (!slainStack) {
          await handleAdversaryChange(adversary, { slain: true });
          return;
        }
        await handleAdversaryRemove(adversary);
      } else {
        await handleAdversaryChange(adversary, { count: adversary.count - 1 });
      }
      if (slainStack) {
        await handleAdversaryChange(slainStack, { count: slainStack.count + 1 });
      } else {
        const created = await sessionAdversariesApi.create({
          sessionId: session.id,
          adversaryId: adversary.adversaryId,
          combatId: adversary.combatId ?? activeCombatId!,
          count: 1,
          slain: true,
        });
        setSessionAdversaries((prev) => [...prev, created]);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not record that Minion as slain.');
    }
  }

  // A drag on the board: lib/minionGroups decides what it means, this just
  // carries the resulting writes out, in order.
  async function handleMinionMove(sourceId: string, amount: MoveAmount, target: MoveTarget) {
    const ops = planMinionMove(activeSessionAdversaries, sourceId, amount, target, () => crypto.randomUUID());
    try {
      for (const op of ops) {
        if (op.kind === 'create') {
          const created = await sessionAdversariesApi.create({
            sessionId: session.id,
            adversaryId: op.adversaryId,
            combatId: op.combatId ?? activeCombatId!,
            count: op.count,
            groupId: op.groupId,
          });
          setSessionAdversaries((prev) => [...prev, created]);
          continue;
        }
        const record = sessionAdversaries.find((a) => a.id === op.id);
        if (!record) continue;
        if (op.kind === 'remove') await handleAdversaryRemove(record);
        else await handleAdversaryChange(record, op.patch);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not regroup those Minions.');
    }
  }

  // A dragged tile touching its duplicate: the duplicate joins the dragged
  // stack at once. Several can be touched in one sweep, faster than React
  // re-renders, so this works from (and updates) a ref of the latest list
  // rather than the `sessionAdversaries` this render closed over, and
  // queues its writes one behind another.
  const latestAdversaries = useRef(sessionAdversaries);
  latestAdversaries.current = sessionAdversaries;
  const pickUpWrites = useRef<Promise<unknown>>(Promise.resolve());
  function handlePickUp(sourceId: string, targetId: string) {
    const list = latestAdversaries.current.filter((a) => !a.slain);
    const ops = planPickUp(list, sourceId, targetId, () => crypto.randomUUID());
    if (ops.length === 0) return;
    let next = latestAdversaries.current;
    for (const op of ops) {
      if (op.kind === 'update') next = next.map((a) => (a.id === op.id ? { ...a, ...op.patch } : a));
      if (op.kind === 'remove') next = next.filter((a) => a.id !== op.id);
    }
    latestAdversaries.current = next;
    setSessionAdversaries(next);
    pickUpWrites.current = pickUpWrites.current
      .then(async () => {
        for (const op of ops) {
          if (op.kind === 'update') await sessionAdversariesApi.update(op.id, op.patch, { sessionId: session.id });
          if (op.kind === 'remove') await sessionAdversariesApi.remove(op.id, { sessionId: session.id });
        }
      })
      .catch((err) => window.alert(err instanceof Error ? err.message : 'Could not stack those Adversaries.'));
  }

  async function handleCombatChange(combat: Combat, patch: UpdateCombatRequest) {
    setCombats((prev) => prev.map((c) => (c.id === combat.id ? { ...c, ...patch } : c)));
    try {
      await combatsApi.update(combat.id, patch, { sessionId: session.id });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleCombatReorder(next: Combat[]) {
    setCombats(next);
    for (let i = 0; i < next.length; i++) {
      if (next[i].order === i) continue;
      try {
        await combatsApi.update(next[i].id, { order: i }, { sessionId: session.id });
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not save that reorder.');
      }
    }
  }

  async function handleCombatRename(combat: Combat, name: string) {
    setCombats((prev) => prev.map((c) => (c.id === combat.id ? { ...c, name } : c)));
    try {
      await combatsApi.update(combat.id, { name }, { sessionId: session.id });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not rename that tab.');
    }
  }

  async function handleCombatAdd() {
    try {
      // The floor-guard's own tab is always plain "Combat" — number every
      // tab added afterward so two tabs don't default to the identical
      // name (still freely renamable either way).
      const name = combats.length === 0 ? 'Combat' : `Combat ${combats.length + 1}`;
      const created = await combatsApi.create({ sessionId: session.id, name, order: combats.length });
      setCombats((prev) => [...prev, created]);
      setActiveCombatId(created.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not create that tab.');
    }
  }

  // The cascade delete (removing this tab's own Adversaries/Environments)
  // happens server-side, in one atomic store write — see
  // removeCombatAndContents in electron/store.js. Pruning sessionAdversaries
  // here is a tidiness nicety, not a correctness requirement: once
  // activeCombatId moves off this tab's id, nothing will ever filter a
  // match for it again anyway. If this just deleted the session's last
  // remaining tab, the floor-guard effect above fires on the next render
  // and recreates "Combat" with no extra call needed here.
  async function handleCombatDelete(combat: Combat) {
    if (!window.confirm(`Delete "${combat.name}"? Its Adversaries and Environments can't be recovered.`)) return;
    try {
      await combatsApi.remove(combat.id, { sessionId: session.id });
      setSessionAdversaries((prev) => prev.filter((a) => a.combatId !== combat.id));
      setCombats((prev) => {
        const next = prev.filter((c) => c.id !== combat.id);
        if (activeCombatId === combat.id) setActiveCombatId(next[0]?.id ?? null);
        return next;
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete that tab.');
    }
  }

  async function handleAdversaryChange(adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) {
    setSessionAdversaries((prev) => prev.map((a) => (a.id === adversary.id ? { ...a, ...patch } : a)));
    try {
      await sessionAdversariesApi.update(adversary.id, patch, { sessionId: session.id });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleAdversaryRemove(adversary: SessionAdversary) {
    setSessionAdversaries((prev) => prev.filter((a) => a.id !== adversary.id));
    try {
      await sessionAdversariesApi.remove(adversary.id, { sessionId: session.id });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not push that Adversary out.');
    }
  }

  // Moved here from the now-deleted AdventuringPanel along with LootRoller
  // itself — just translates a finished roll/removal into the Session API
  // call, the same role this file already plays for the Adversary handlers
  // above.
  async function handleRoll(entry: NewLootLogEntry) {
    try {
      onSessionSaved(await sessionsApi.addLoot(session.id, entry));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that roll.');
    }
  }

  async function handleRemoveLoot(entryId: string) {
    try {
      onSessionSaved(await sessionsApi.removeLoot(session.id, entryId));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not remove that entry.');
    }
  }

  // Keeps the shared music context pointed at this Session's region (so it
  // resolves the right track and the sidebar/floating players agree with
  // what's actually playing) — the context is what survives navigating
  // away, this effect is just what keeps it in sync while here.
  useEffect(() => {
    setMusicSession({ campaignId, sessionId: session.id, sessionName: session.name, regionId: session.regionId ?? null });
  }, [campaignId, session.id, session.name, session.regionId, setMusicSession]);

  useEffect(() => {
    setViewingSessionId(session.id);
    return () => setViewingSessionId(null);
  }, [session.id, setViewingSessionId]);

  async function persist(patch: UpdateSessionRequest) {
    try {
      const saved = await sessionsApi.update(session.id, patch);
      onSessionSaved(saved);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save that change.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${session.name}"? This can't be undone.`)) return;
    try {
      await sessionsApi.remove(session.id);
      clearIfSession(session.id);
      onSessionDeleted(session.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the Session.');
    }
  }

  return (
    <div className="session-view">
      <button type="button" className="session-view__back" onClick={onBack}>
        &larr; Back to Campaign
      </button>

      {editing ? (
        <div className="session-view__edit-panel">
          <SessionForm
            campaignId={campaignId}
            initial={session}
            onSaved={(saved) => {
              onSessionSaved(saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="session-view__header">
          <h1 className="session-view__title">{session.name}</h1>
          <div className="session-view__header-actions">
            <button type="button" className="session-view__header-action" onClick={() => setEditing(true)}>
              Rename
            </button>
            <button
              type="button"
              className="session-view__header-action session-view__header-action--danger"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="session-view__layout">
        <div className="session-view__main">
          {sectionOrder.map((id, index) => (
            <div key={id} className={`session-view__section${getRowClassName(index)}`}>
              <SessionSectionShell title={SECTION_TITLES[id]} dragHandleProps={getHandleProps(index)}>
                {id === 'ADVERSARIES' && (
                  <>
                    {!combatsLoading && combats.length > 0 && activeCombatId && (
                      <TabBar
                        tabs={combats}
                        activeId={activeCombatId}
                        noun="Combat"
                        hook="combat-tab-bar"
                        onSelect={selectCombat}
                        onReorder={handleCombatReorder}
                        onRename={handleCombatRename}
                        onAdd={handleCombatAdd}
                        onDelete={handleCombatDelete}
                      />
                    )}
                    {activeCombat && (
                      <BattlePointsBar
                        combat={activeCombat}
                        combatants={tabAdversaries}
                        partyCount={partyCount}
                        campaignLevel={campaignLevel}
                        onChange={(patch) => handleCombatChange(activeCombat, patch)}
                      />
                    )}
                    {activeCombatId && (
                      <CombatPanel
                        sessionId={session.id}
                        activeCombatId={activeCombatId}
                        firstCombatId={firstCombatId}
                        sessionAdversaries={activeSessionAdversaries}
                        adversariesLoading={adversariesLoading}
                        adversariesError={adversariesError}
                        spotlightSignal={combatSpotlight}
                        onPullInAdversary={pullInAdversary}
                        onAdversaryChange={handleAdversaryChange}
                        onAdversaryRemove={handleAdversaryRemove}
                        onMinionCount={handleMinionCount}
                        onMinionMove={handleMinionMove}
                        onPickUp={handlePickUp}
                        onRoll={addRoll}
                      />
                    )}
                  </>
                )}
                {id === 'NOTES' && <SessionNotesPanel campaignId={campaignId} session={session} tabSignal={notesTabSignal} />}
              </SessionSectionShell>
            </div>
          ))}
        </div>

        <aside className="session-view__sidebar">
          <SessionMusicPanel
            campaignId={campaignId}
            regionId={session.regionId ?? null}
            onRegionChange={(regionId) => persist({ regionId })}
          />
          <SessionCombatSidebar
            sessionAdversaries={activeSessionAdversaries}
            slain={slainAdversaries}
            onChange={handleAdversaryChange}
            onSelect={(id) => setCombatSpotlight({ id, key: Date.now() })}
            onRemove={handleAdversaryRemove}
            onMinionCount={handleMinionCount}
          />
          <LootRoller lootLog={session.lootLog} sessionId={session.id} onRoll={handleRoll} onRemove={handleRemoveLoot} />
        </aside>
      </div>

      {/* Fixed to the window's left edge, not part of the page flow. */}
      <FearTrack fear={session.fear} onChange={(fear) => persist({ fear })} />
      <DiceTray onRoll={addRoll} />
      <RollLogPanel entries={rollLog} onClear={clearRollLog} />
    </div>
  );
}
