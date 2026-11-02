const router = require('express').Router();
const prisma = require('../prisma');

const safeUser = user => ({ id: user.id, userId: user.id, name: user.name, gameId: user.gameId, profilePhoto: user.profilePhoto || null });

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { gameId: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true, gameId: true, profilePhoto: true },
      orderBy: { name: 'asc' },
      take: 20
    });
    return res.json({ users });
  } catch (error) { next(error); }
});

// Incoming requests: the receiver sees the actual sender's name and game ID.
router.get('/requests', async (req, res, next) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { receiverId: req.user.id, status: 'PENDING' },
        include: { sender: { select: { id: true, name: true, gameId: true, profilePhoto: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.friendRequest.findMany({
        where: { senderId: req.user.id, status: 'PENDING' },
        include: { receiver: { select: { id: true, name: true, gameId: true, profilePhoto: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    res.json({
      incoming: incoming.map(row => ({ requestId: row.id, ...safeUser(row.sender) })),
      outgoing: outgoing.map(row => ({ requestId: row.id, ...safeUser(row.receiver) }))
    });
  } catch (error) { next(error); }
});

router.get('/friends', async (req, res, next) => {
  try {
    const rows = await prisma.friendRequest.findMany({
      where: { status: 'ACCEPTED', OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      include: {
        sender: { select: { id: true, name: true, gameId: true, profilePhoto: true } },
        receiver: { select: { id: true, name: true, gameId: true, profilePhoto: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    const unique = new Map();
    for (const row of rows) {
      const friend = row.senderId === req.user.id ? row.receiver : row.sender;
      unique.set(friend.id, safeUser(friend));
    }
    res.json({ friends: [...unique.values()] });
  } catch (error) { next(error); }
});

router.post('/requests', async (req, res, next) => {
  try {
    const receiverId = String(req.body.receiverId || '');
    if (!receiverId || receiverId === req.user.id) return res.status(400).json({ message: 'Invalid friend request.' });
    const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
    if (!receiver) return res.status(404).json({ message: 'User not found.' });

    const existing = await prisma.friendRequest.findFirst({
      where: { OR: [
        { senderId: req.user.id, receiverId },
        { senderId: receiverId, receiverId: req.user.id }
      ] }
    });
    if (existing?.status === 'ACCEPTED') return res.status(409).json({ message: 'Already friends.' });
    if (existing?.status === 'PENDING') {
      if (existing.senderId === req.user.id) return res.status(409).json({ message: 'Friend request already sent.' });
      const accepted = await prisma.friendRequest.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
      const io = req.app.get('io');
      io.to(receiverId).emit('friend:updated', { status: accepted.status, by: req.user.id });
      io.to(req.user.id).emit('friend:updated', { status: accepted.status, by: req.user.id });
      return res.json({ message: 'Friend request accepted.', status: accepted.status });
    }
    const created = existing
      ? await prisma.friendRequest.update({
          where: { id: existing.id },
          data: { senderId: req.user.id, receiverId, status: 'PENDING', updatedAt: new Date() }
        })
      : await prisma.friendRequest.create({ data: { senderId: req.user.id, receiverId } });
    const io = req.app.get('io');
    io.to(receiverId).emit('friend:request', { requestId: created.id, senderId: req.user.id });
    res.status(201).json({ message: 'Friend request sent.', requestId: created.id });
  } catch (error) { next(error); }
});

router.put('/requests/:requestId', async (req, res, next) => {
  try {
    const action = String(req.body.action || '');
    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ message: 'Invalid request action.' });
    const request = await prisma.friendRequest.findFirst({
      where: { id: req.params.requestId, receiverId: req.user.id, status: 'PENDING' }
    });
    if (!request) return res.status(404).json({ message: 'Friend request not found.' });
    const updated = await prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' }
    });
    const io = req.app.get('io');
    io.to(request.senderId).emit('friend:updated', { status: updated.status, by: req.user.id });
    io.to(req.user.id).emit('friend:updated', { status: updated.status, by: req.user.id });
    res.json({ status: updated.status });
  } catch (error) { next(error); }
});

router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePhoto: true }
    });
    res.json({ profilePhoto: user?.profilePhoto || null });
  } catch (error) { next(error); }
});

router.put('/profile', async (req, res, next) => {
  try {
    const profilePhoto = req.body.profilePhoto;
    if (profilePhoto !== null && (typeof profilePhoto !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(profilePhoto) || profilePhoto.length > 1200000)) {
      return res.status(400).json({ message: 'Profile photo must be a supported image under 900 KB.' });
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { profilePhoto } });
    res.json({ profilePhoto });
  } catch (error) { next(error); }
});

router.get('/status', async (req, res, next) => {
  try {
    const rows = await prisma.status.findMany({
      where: { userId: req.user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ statuses: rows.map(row => ({ id: row.id, url: row.mediaUrl, type: row.type, time: row.createdAt })) });
  } catch (error) { next(error); }
});

router.get('/:userId/status', async (req, res, next) => {
  try {
    const friend = await prisma.friendRequest.findFirst({
      where: { status: 'ACCEPTED', OR: [
        { senderId: req.user.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id }
      ] }
    });
    if (!friend) return res.status(403).json({ message: 'You can only view a friend status.' });
    const rows = await prisma.status.findMany({
      where: { userId: req.params.userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ statuses: rows.map(row => ({ id: row.id, url: row.mediaUrl, type: row.type, time: row.createdAt })) });
  } catch (error) { next(error); }
});

router.post('/status', async (req, res, next) => {
  try {
    const { mediaUrl, type } = req.body;
    if (typeof mediaUrl !== 'string' || !/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,/.test(mediaUrl) || mediaUrl.length > 9000000) {
      return res.status(400).json({ message: 'Status must be a supported image/video under 6 MB.' });
    }
    const row = await prisma.status.create({
      data: { userId: req.user.id, mediaUrl, type: String(type || '').slice(0, 100), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    });
    res.status(201).json({ status: { id: row.id, url: row.mediaUrl, type: row.type, time: row.createdAt } });
  } catch (error) { next(error); }
});

router.delete('/status/:statusId', async (req, res, next) => {
  try {
    const deleted = await prisma.status.deleteMany({ where: { id: req.params.statusId, userId: req.user.id } });
    if (!deleted.count) return res.status(404).json({ message: 'Status not found.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

module.exports = router;
