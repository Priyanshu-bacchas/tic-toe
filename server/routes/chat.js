const router=require('express').Router();
const bcrypt=require('bcrypt');
const prisma=require('../prisma');
const modes=new Set(['off','after_seen','24h','7d']);
const key=(a,b)=>[a,b].sort().join(':');
const expiry=mode=>mode==='24h'?new Date(Date.now()+86400000):mode==='7d'?new Date(Date.now()+604800000):null;

router.get('/pin-status',async(req,res)=>{const u=await prisma.user.findUnique({where:{id:req.user.id},select:{pinHash:true}});res.json({hasPin:!!u?.pinHash});});
router.put('/pin',async(req,res)=>{
 const pin=String(req.body.pin||''); if(!/^\d{4,8}$/.test(pin)) return res.status(400).json({message:'PIN must contain 4 to 8 digits.'});
 await prisma.user.update({where:{id:req.user.id},data:{pinHash:await bcrypt.hash(pin,12)}});res.json({message:'PIN saved.'});
});
router.post('/unlock',async(req,res)=>{
 const pin=String(req.body.pin||''),u=await prisma.user.findUnique({where:{id:req.user.id},select:{pinHash:true}});
 if(!u?.pinHash) return res.status(400).json({message:'Set a private PIN first.'});
 if(!await bcrypt.compare(pin,u.pinHash)) return res.status(403).json({message:'Incorrect PIN.'});
 res.json({unlocked:true});
});
router.get('/contacts',async(req,res)=>{
 const rows=await prisma.message.findMany({where:{OR:[{senderId:req.user.id},{receiverId:req.user.id}]},orderBy:{createdAt:'desc'},select:{senderId:true,sender:{select:{id:true,name:true,gameId:true}},receiver:{select:{id:true,name:true,gameId:true}}}});
 const found=new Map(); for(const m of rows){const c=m.senderId===req.user.id?m.receiver:m.sender;if(!found.has(c.id))found.set(c.id,c);}
 res.json({contacts:[...found.values()]});
});
router.get('/:userId/settings',async(req,res)=>{
 const other=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
 if(!other||other.id===req.user.id)return res.status(404).json({message:'Player not found.'});
 const p=await prisma.chatPreference.findUnique({where:{conversationKey:key(req.user.id,other.id)}});
 res.json({mode:p?.mode||'off'});
});
router.put('/:userId/settings',async(req,res)=>{
 const mode=String(req.body.mode||'');if(!modes.has(mode))return res.status(400).json({message:'Invalid timer option.'});
 const other=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
 if(!other||other.id===req.user.id)return res.status(404).json({message:'Player not found.'});
 const conversationKey=key(req.user.id,other.id);
 await prisma.chatPreference.upsert({where:{conversationKey},create:{conversationKey,mode},update:{mode}});
 const io=req.app.get('io');io.to(other.id).emit('chat:setting-changed',{mode,by:req.user.id});io.to(req.user.id).emit('chat:setting-changed',{mode,by:req.user.id});
 res.json({mode,message:'Timer updated. It applies to new messages.'});
});
router.get('/:userId',async(req,res)=>{
 const other=await prisma.user.findUnique({where:{id:req.params.userId},select:{id:true}});
 if(!other||other.id===req.user.id)return res.status(404).json({message:'Player not found.'});
 const now=new Date(),where={OR:[{senderId:req.user.id,receiverId:other.id},{senderId:other.id,receiverId:req.user.id}]};
 await prisma.message.deleteMany({where:{...where,expiresAt:{lte:now}}});
 const pref=await prisma.chatPreference.findUnique({where:{conversationKey:key(req.user.id,other.id)}});
 const unread={senderId:other.id,receiverId:req.user.id,readAt:null};
 if(pref?.mode==='after_seen') await prisma.message.updateMany({where:{...unread,expiresAt:null},data:{readAt:now,expiresAt:new Date(Date.now()+3000)}});
 else await prisma.message.updateMany({where:unread,data:{readAt:now}});
 const messages=await prisma.message.findMany({where:{...where,OR:undefined,AND:[{OR:[{senderId:req.user.id,receiverId:other.id},{senderId:other.id,receiverId:req.user.id}]},{OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}]},orderBy:{createdAt:'asc'},take:300});
 res.json({messages,mode:pref?.mode||'off'});
});
router.post('/message',async(req,res)=>{
 const receiverId=String(req.body.receiverId||''),content=String(req.body.content||'').trim();
 if(!content||content.length>4000)return res.status(400).json({message:'Message must be 1–4000 characters.'});
 if(receiverId===req.user.id)return res.status(400).json({message:'Cannot message yourself.'});
 const receiver=await prisma.user.findUnique({where:{id:receiverId},select:{id:true}});
 if(!receiver)return res.status(404).json({message:'Player not found.'});
 const p=await prisma.chatPreference.findUnique({where:{conversationKey:key(req.user.id,receiverId)}});
 const mode=p?.mode||'off';
 const message=await prisma.message.create({data:{senderId:req.user.id,receiverId,content,expiresAt:expiry(mode)}});
 const payload={...message,disappearMode:mode},io=req.app.get('io');
 io.to(receiverId).emit('message:new',payload);io.to(req.user.id).emit('message:new',payload);
 res.status(201).json({message:payload});
});
module.exports=router;