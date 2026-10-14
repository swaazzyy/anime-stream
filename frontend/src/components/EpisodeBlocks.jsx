import { useState } from 'react';

const SIZE = 100;

// Long series (One Piece: 1100+ episodes) show 100 episodes at a time, starting at the block holding `current`.
// children(shown) renders the visible episodes; give the component a key per anime/episode to reset the picked block.
export default function EpisodeBlocks({ episodes, current, dark = true, onJump, children }) {
  const [picked, setPicked] = useState(null);
  if (episodes.length <= SIZE) return children(episodes);

  const blocks = Math.ceil(episodes.length / SIZE);
  const block = Math.min(picked ?? Math.max(0, Math.floor(episodes.findIndex(ep => ep.number === current) / SIZE)), blocks - 1);
  const first = episodes[0].number;
  const last = episodes.at(-1).number;

  const pill = (active) => `px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
    active ? 'bg-[#f47521] text-black' : dark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {Array.from({ length: blocks }, (_, i) => (
          <button key={i} type="button" onClick={() => setPicked(i)} className={pill(i === block)}>
            {episodes[i * SIZE].number}–{episodes[Math.min((i + 1) * SIZE, episodes.length) - 1].number}
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onJump(Number(e.currentTarget.ep.value));
          }}
        >
          <input
            name="ep"
            type="number"
            min={first}
            max={last}
            required
            placeholder="Ir al cap #"
            aria-label="Ir al episodio número"
            className={`w-28 px-3 py-1 rounded-full text-xs font-bold border focus:outline-none focus:border-[#f47521] ${
              dark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`}
          />
        </form>
      </div>
      {children(episodes.slice(block * SIZE, (block + 1) * SIZE))}
    </>
  );
}
