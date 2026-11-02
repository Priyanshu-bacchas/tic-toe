const router = require('express').Router();
const prisma = require('../prisma');

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.id }, OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { gameId: { contains: q, mode: 'insensitive' } }
      ] },
      select: { id: true, name: true, gameId: true },
      orderBy: { name: 'asc' },
      take: 20
    });
    if (!users.length) return res.status(404).json({ message: 'No players found.' });
    return res.json({ users });
  } catch (error) { next(error); }
});

module.exports = router;
