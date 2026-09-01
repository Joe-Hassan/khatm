import { kv } from '@vercel/kv';

const BOARD_KEY = 'khatm-board';
const TOTAL = 30;

function defaultBoard() {
  return Array.from({ length: TOTAL }, (_, i) => ({
    number: i + 1,
    status: 'open',
    claimedBy: null,
  }));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    let board = await kv.get(BOARD_KEY);
    if (!board) {
      board = defaultBoard();
      await kv.set(BOARD_KEY, board);
    }
    return res.status(200).json(board);
  }

  if (req.method === 'POST') {
    const { board } = req.body;
    if (!Array.isArray(board)) {
      return res.status(400).json({ error: 'invalid board' });
    }
    await kv.set(BOARD_KEY, board);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end();
}
