const router = require("express").Router();
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const modes = new Set(["after_seen", "12h"]);
const key = (a, b) => [a, b].sort().join(":");
const DAY_MS = 24 * 60 * 60 * 1000;
const expiryFor = mode => new Date(Date.now() + (mode === "after_seen" ? DAY_MS : 12 * 60 * 60 * 1000));

async function isAcceptedFriend(userId, otherId) {
  if (!otherId || otherId === userId) return false;
  const relation = await prisma.friendRequest.findFirst({
    where: { status: "ACCEPTED", OR: [{ senderId: userId, receiverId: otherId }, { senderId: otherId, receiverId: userId }] },
    select: { id: true }
  });
  return Boolean(relation);
}
async function requireFriend(req, res, next) {
  try {
    if (!await isAcceptedFriend(req.user.id, req.params.userId)) return res.status(403).json({ message: "Chat is available only with accepted friends." });
    next();
  } catch (error) { next(error); }
}

router.get("/keys/me", async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { chatPublicKey: true } });
  res.json({ publicKey: u?.chatPublicKey || null });
});
router.put("/keys/me", async (req, res) => {
  const publicKey = String(req.body.publicKey || "");
  if (!publicKey || publicKey.length > 2000) return res.status(400).json({ message: "Invalid public key." });
  await prisma.user.update({ where: { id: req.user.id }, data: { chatPublicKey: publicKey } });
  res.json({ saved: true });
});
router.get("/keys/:userId", requireFriend, async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { chatPublicKey: true } });
  if (!u) return res.status(404).json({ message: "User not found." });
  res.json({ publicKey: u.chatPublicKey || null });
});

router.get("/pin-status", async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { pinHash: true } });
  res.json({ hasPin: !!u?.pinHash });
});
router.put("/pin", async (req, res) => {
  const pin = String(req.body.pin || "");
  if (!/^\\d{4,8}$/.test(pin)) return res.status(400).json({ message: "PIN must contain 4 to 8 digits." });
  await prisma.user.update({ where: { id: req.user.id }, data: { pinHash: await bcrypt.hash(pin, 12) } });
  res.json({ message: "PIN saved." });
});
router.post("/unlock", async (req, res) => {
  const pin = String(req.body.pin || "");
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { pinHash: true } });
  if (!u?.pinHash) return res.status(400).json({ message: "Set a private PIN first." });
  if (!await bcrypt.compare(pin, u.pinHash)) return res.status(403).json({ message: "Incorrect PIN." });
  res.json({ unlocked: true });
});

router.get("/contacts", async (req, res) => {
  const cutoff = new Date(Date.now() - DAY_MS);
  const rows = await prisma.message.findMany({
    where: { createdAt: { gt: cutoff }, OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
    orderBy: { createdAt: "desc" },
    select: { senderId: true, sender: { select: { id: true, name: true, gameId: true } }, receiver: { select: { id: true, name: true, gameId: true } } }
  });
  const found = new Map();
  for (const m of rows) {
    const c = m.senderId === req.user.id ? m.receiver : m.sender;
    if (c.id !== req.user.id && await isAcceptedFriend(req.user.id, c.id) && !found.has(c.id)) found.set(c.id, c);
  }
  res.json({ contacts: [...found.values()] });
});

// Return unread incoming-message totals, grouped by friend, for the chat list.
router.get("/unread-counts", async (req, res, next) => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - DAY_MS);
    const rows = await prisma.message.groupBy({
      by: ["senderId"],
      where: {
        receiverId: req.user.id,
        readAt: null,
        createdAt: { gt: cutoff },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      _count: { _all: true }
    });
    const counts = Object.fromEntries(rows.map(row => [row.senderId, row._count._all]));
    res.json({ counts });
  } catch (error) {
    next(error);
  }
});

router.get("/:userId/settings", requireFriend, async (req, res) => {
  const p = await prisma.chatPreference.findUnique({ where: { conversationKey: key(req.user.id, req.params.userId) } });
  res.json({ mode: p?.mode === "after_seen" ? "after_seen" : "12h" });
});
router.put("/:userId/settings", requireFriend, async (req, res) => {
  const mode = String(req.body.mode || "");
  if (!modes.has(mode)) return res.status(400).json({ message: "Choose After Seen or After 12 Hours." });
  const otherId = req.params.userId;
  const conversationKey = key(req.user.id, otherId);
  // The existing Neon ChatPreference constraint allows "24h", not "12h".
  // Keep the user-facing mode as 12h and store the compatible database value.
  const storedMode = mode === "12h" ? "24h" : mode;
  await prisma.chatPreference.upsert({
    where: { conversationKey },
    create: { conversationKey, mode: storedMode },
    update: { mode: storedMode }
  });
  const io = req.app.get("io");
  io.to(otherId).emit("chat:setting-changed", { mode, by: req.user.id });
  io.to(req.user.id).emit("chat:setting-changed", { mode, by: req.user.id });
  res.json({ mode, message: "Disappearing-message setting updated. It applies to new messages." });
});

router.delete("/:userId/messages", requireFriend, async (req, res, next) => {
  try {
    const otherId = req.params.userId;
    const result = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: otherId },
          { senderId: otherId, receiverId: req.user.id }
        ]
      }
    });

    const io = req.app.get("io");
    io.to(req.user.id).emit("chat:cleared", { with: otherId });
    io.to(otherId).emit("chat:cleared", { with: req.user.id });
    res.json({ cleared: true, deletedCount: result.count });
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", requireFriend, async (req, res) => {
  const otherId = req.params.userId;
  const now = new Date();
  const cutoff = new Date(now.getTime() - DAY_MS);
  const conversation = { OR: [{ senderId: req.user.id, receiverId: otherId }, { senderId: otherId, receiverId: req.user.id }] };
  await prisma.message.deleteMany({ where: { AND: [conversation, { OR: [{ expiresAt: { lte: now } }, { createdAt: { lte: cutoff } }] }] } });

  const pref = await prisma.chatPreference.findUnique({ where: { conversationKey: key(req.user.id, otherId) } });
  const mode = pref?.mode === "after_seen" ? "after_seen" : "12h";
  const unread = { senderId: otherId, receiverId: req.user.id, readAt: null };
  if (mode === "after_seen") {
    await prisma.message.updateMany({ where: { ...unread, expiresAt: { gt: now } }, data: { readAt: now, expiresAt: new Date(now.getTime() + 3000) } });
  } else {
    await prisma.message.updateMany({ where: unread, data: { readAt: now } });
  }

  const messages = await prisma.message.findMany({
    where: { AND: [conversation, { createdAt: { gt: cutoff } }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] },
    orderBy: { createdAt: "asc" },
    take: 300
  });
  res.json({ messages, mode });
});

router.post("/message", async (req, res) => {
  const receiverId = String(req.body.receiverId || "");
  const content = String(req.body.content || "").trim();
  if (!content || content.length > 12000) return res.status(400).json({ message: "Message must be between 1 and 12000 characters." });
  if (!await isAcceptedFriend(req.user.id, receiverId)) return res.status(403).json({ message: "You can message only accepted friends." });
  const p = await prisma.chatPreference.findUnique({ where: { conversationKey: key(req.user.id, receiverId) } });
  const mode = p?.mode === "after_seen" ? "after_seen" : "12h";
  const message = await prisma.message.create({ data: { senderId: req.user.id, receiverId, content, expiresAt: expiryFor(mode) } });
  const payload = { ...message, disappearMode: mode };
  const io = req.app.get("io");
  io.to(receiverId).emit("message:new", payload);
  io.to(req.user.id).emit("message:new", payload);
  res.status(201).json({ message: payload });
});
module.exports = router;
