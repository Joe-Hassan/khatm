import { useState, useEffect, useCallback, useRef } from 'react';

const TOTAL = 30;
const BOARD_KEY = 'khatm-board';

function defaultBoard() {
  return Array.from({ length: TOTAL }, (_, i) => ({
    number: i + 1,
    status: 'open', // 'open' | 'claimed' | 'completed'
    claimedBy: null,
  }));
}

async function fetchBoard() {
  try {
    const result = await window.storage.get(BOARD_KEY, true);
    if (result && result.value) return JSON.parse(result.value);
    throw new Error('empty');
  } catch (e) {
    const init = defaultBoard();
    await window.storage.set(BOARD_KEY, JSON.stringify(init), true);
    return init;
  }
}

export default function KhatmBoard() {
  const [board, setBoard] = useState(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchBoard();
      setBoard(fresh);
    } catch (e) {
      setNotice('Having trouble reaching the shared board. Pull to refresh.');
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const commit = async (mutate, expectStatus) => {
    if (!name.trim()) {
      setNotice('Enter your name first.');
      nameRef.current && nameRef.current.focus();
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const fresh = await fetchBoard();
      const entry = fresh.find((j) => j.number === selected);
      if (expectStatus && entry.status !== expectStatus) {
        setBoard(fresh);
        setNotice(
          entry.status === 'open'
            ? `Juz ${selected} is open again.`
            : `Juz ${selected} is ${entry.status === 'completed' ? 'already marked read' : `now held by ${entry.claimedBy}`}.`
        );
        setBusy(false);
        return;
      }
      const updated = fresh.map((j) => (j.number === selected ? mutate(j) : j));
      const result = await window.storage.set(BOARD_KEY, JSON.stringify(updated), true);
      if (!result) throw new Error('save failed');
      setBoard(updated);
    } catch (e) {
      setNotice('Could not save that — please try again.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const claim = () => commit((j) => ({ ...j, status: 'claimed', claimedBy: name.trim() }), 'open');

  const release = () => {
    const entry = board.find((j) => j.number === selected);
    if (entry.claimedBy?.toLowerCase() !== name.trim().toLowerCase()) {
      setNotice(`Only ${entry.claimedBy} can release this one.`);
      return;
    }
    commit((j) => ({ ...j, status: 'open', claimedBy: null }), 'claimed');
  };

  const complete = () => {
    const entry = board.find((j) => j.number === selected);
    if (entry.claimedBy?.toLowerCase() !== name.trim().toLowerCase()) {
      setNotice(`Only ${entry.claimedBy} can mark this one read.`);
      return;
    }
    commit((j) => ({ ...j, status: 'completed' }), 'claimed');
  };

  if (!board) {
    return (
      <div className="min-h-screen bg-[#0F2A24] flex items-center justify-center">
        <p className="text-[#D8CFB0] font-serif text-lg">Opening the board…</p>
      </div>
    );
  }

  const doneCount = board.filter((j) => j.status === 'completed').length;
  const claimedCount = board.filter((j) => j.status === 'claimed').length;
  const entry = selected ? board.find((j) => j.number === selected) : null;
  const isMine = entry && entry.claimedBy?.toLowerCase() === name.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-[#0F2A24]">
      <div className="max-w-md mx-auto px-5 pt-8 pb-24">
        <header className="mb-6">
          <h1 className="font-serif text-[#F0E6C8] text-3xl leading-tight">
            Thirty Juz, Thirty Readers
          </h1>
          <p className="text-[#8FAA9C] text-sm mt-1.5">
            Tap an open number to claim it. Mark it read once you finish.
          </p>
        </header>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-[#8FAA9C] mb-1.5">
            <span>{doneCount} read · {claimedCount} in progress</span>
            <span>{TOTAL - doneCount - claimedCount} open</span>
          </div>
          <div className="h-1.5 bg-[#1B3E36] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#C9A227]"
              style={{ width: `${(doneCount / TOTAL) * 100}%` }}
            />
            <div
              className="h-full bg-[#4E6B5D]"
              style={{ width: `${(claimedCount / TOTAL) * 100}%` }}
            />
          </div>
        </div>

        <label className="block mb-6">
          <span className="text-xs uppercase tracking-wide text-[#8FAA9C]">Your name</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amr"
            type="text"
            inputMode="text"
            autoCapitalize="words"
            autoCorrect="off"
            autoComplete="off"
            enterKeyHint="done"
            style={{ fontSize: '16px' }}
            className="mt-1.5 w-full bg-[#16352D] text-[#F0E6C8] placeholder-[#5C7A6C] rounded-lg px-3.5 py-2.5 outline-none border border-[#2A5346] focus:border-[#C9A227] transition-colors"
          />
        </label>

        <div className="grid grid-cols-5 gap-2.5">
          {board.map((j) => {
            const isSel = selected === j.number;
            const base =
              j.status === 'completed'
                ? 'bg-[#C9A227] text-[#0F2A24] border-[#C9A227]'
                : j.status === 'claimed'
                ? 'bg-[#2A5346] text-[#F0E6C8] border-[#4E6B5D]'
                : 'bg-[#16352D] text-[#D8CFB0] border-[#2A5346]';
            return (
              <button
                key={j.number}
                onClick={() => {
                  setSelected(j.number);
                  setNotice('');
                }}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition-transform active:scale-95 ${base} ${
                  isSel ? 'ring-2 ring-[#F0E6C8] ring-offset-2 ring-offset-[#0F2A24]' : ''
                }`}
              >
                <span className="font-serif text-lg leading-none">{j.number}</span>
                {j.status === 'completed' && <span className="text-[10px] mt-1">✓</span>}
              </button>
            );
          })}
        </div>

        {notice && (
          <p className="mt-5 text-sm text-[#E8B4A0] bg-[#3A2420] border border-[#5C3A32] rounded-lg px-3.5 py-2.5">
            {notice}
          </p>
        )}

        {entry && (
          <div className="mt-5 bg-[#16352D] border border-[#2A5346] rounded-xl p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-[#F0E6C8] text-xl">Juz {entry.number}</h2>
              <span className="text-xs text-[#8FAA9C]">
                {entry.status === 'open' && 'Open'}
                {entry.status === 'claimed' && `Held by ${entry.claimedBy}`}
                {entry.status === 'completed' && `Read by ${entry.claimedBy}`}
              </span>
            </div>

            {entry.status === 'open' && (
              <button
                onClick={claim}
                disabled={busy}
                className="w-full bg-[#C9A227] text-[#0F2A24] font-medium rounded-lg py-2.5 disabled:opacity-50"
              >
                Claim this juz
              </button>
            )}

            {entry.status === 'claimed' && (
              <div className="flex gap-2.5">
                <button
                  onClick={complete}
                  disabled={busy}
                  className="flex-1 bg-[#C9A227] text-[#0F2A24] font-medium rounded-lg py-2.5 disabled:opacity-50"
                >
                  Mark read
                </button>
                <button
                  onClick={release}
                  disabled={busy}
                  className="flex-1 bg-transparent border border-[#4E6B5D] text-[#D8CFB0] rounded-lg py-2.5 disabled:opacity-50"
                >
                  Release
                </button>
              </div>
            )}

            {entry.status === 'completed' && (
              <p className="text-sm text-[#8FAA9C]">Alhamdulillah — this one is done.</p>
            )}

            {entry.status !== 'open' && !isMine && (
              <p className="text-xs text-[#5C7A6C] mt-2">
                Only {entry.claimedBy} can change this one.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-[#5C7A6C] mt-8 text-center">
          Everyone using this link sees the same board — refreshes automatically every few seconds.
        </p>
      </div>
    </div>
  );
}
